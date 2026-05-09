import type { AudioData } from './types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | MediaStreamAudioSourceNode | OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private dataArray: Uint8Array = new Uint8Array(0);
  private smoothData: AudioData = { bass: 0, lowMids: 0, highMids: 0, treble: 0, average: 0, kick: false, snare: false, kickEnergy: 0, snareEnergy: 0 };
  private smoothing = 0.65;
  private isPlaying = false;
  private isSuspended = false;
  private demoOscillators: OscillatorNode[] = [];
  private demoGains: GainNode[] = [];
  private currentMode: 'file' | 'microphone' | 'demo' | null = null;
  private lastFile: File | null = null;

  // Beat detection: ring buffers (history EXCLUDES current frame)
  private bassHistory: number[] = new Array(40).fill(0);
  private bassFluxHistory: number[] = new Array(20).fill(0); // spectral flux
  private historyIdx = 0;
  private prevBass = 0;
  private kickCooldown = 0;
  private snareCooldown = 0;

  getContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  async resumeContext(): Promise<void> {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  async suspendContext(): Promise<void> {
    const ctx = this.getContext();
    if (ctx.state === 'running') {
      await ctx.suspend();
    }
  }

  private setupAnalyser() {
    const ctx = this.getContext();
    if (!this.analyser) {
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.25; // lower = more responsive
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
    }
  }

  private getFrequencyData(): Omit<AudioData, 'kick' | 'snare' | 'kickEnergy' | 'snareEnergy'> {
    if (!this.analyser) return { bass: 0, lowMids: 0, highMids: 0, treble: 0, average: 0 };
    (this.analyser as any).getByteFrequencyData(this.dataArray);

    const sampleRate = this.ctx!.sampleRate;
    const binCount = this.dataArray.length;
    const nyquist = sampleRate / 2;
    const binSize = nyquist / binCount;

    const getBand = (minHz: number, maxHz: number) => {
      const minBin = Math.floor(minHz / binSize);
      const maxBin = Math.min(Math.floor(maxHz / binSize), binCount - 1);
      let sum = 0;
      let count = 0;
      for (let i = minBin; i <= maxBin; i++) {
        sum += this.dataArray[i];
        count++;
      }
      return count > 0 ? sum / count / 255 : 0;
    };

    const bass = getBand(20, 100);       // Pure kick zone
    const lowMids = getBand(100, 400);    // Bass guitar/body
    const highMids = getBand(400, 5000);  // Snare/vocals
    const treble = getBand(5000, 15000);  // Hihats/cymbals
    const average = (bass + lowMids + highMids + treble) / 4;

    return { bass, lowMids, highMids, treble, average };
  }

  private detectBeats(raw: { bass: number; highMids: number }): { kick: boolean; snare: boolean; kickEnergy: number; snareEnergy: number } {
    // === SPECTRAL FLUX (onset detection) ===
    // Flux = max(0, current - previous)  -- only rising edges
    const bassFlux = Math.max(0, raw.bass - this.prevBass);
    this.prevBass = raw.bass;

    // Store current bass in history (for average computation)
    // History buffer is 40 frames, does NOT include current
    this.bassHistory[this.historyIdx] = raw.bass;
    this.bassFluxHistory[this.historyIdx % 20] = bassFlux;
    this.historyIdx = (this.historyIdx + 1) % 40;

    // Decay cooldowns
    this.kickCooldown = Math.max(0, this.kickCooldown - 1);
    this.snareCooldown = Math.max(0, this.snareCooldown - 1);

    // === COMPUTE AVERAGES FROM HISTORY ONLY ===
    let bassSum = 0, fluxSum = 0;
    for (let i = 0; i < 40; i++) bassSum += this.bassHistory[i];
    for (let i = 0; i < 20; i++) fluxSum += this.bassFluxHistory[i];
    const bassAvg = bassSum / 40;
    const fluxAvg = fluxSum / 20;

    // === KICK DETECTION (onset-based) ===
    let kick = false;
    let kickEnergy = 0;
    if (this.kickCooldown === 0 && raw.bass > 0.1) {
      // Two conditions must BOTH be met:
      // 1. Bass is significantly above recent average (loud enough)
      // 2. Spectral flux is significantly above recent average (sudden onset)
      const bassThreshold = bassAvg * 1.5 + 0.06;
      const fluxThreshold = fluxAvg * 2.0 + 0.04;

      if (raw.bass > bassThreshold && bassFlux > fluxThreshold) {
        kick = true;
        kickEnergy = Math.min(1, raw.bass * 1.5 + bassFlux * 3);
        this.kickCooldown = 6; // ~100ms at 60fps
      }
    }

    // === SNARE DETECTION (keep but don't use for visuals) ===
    let snare = false;
    let snareEnergy = 0;
    if (this.snareCooldown === 0) {
      const snareThreshold = bassAvg * 0.8 + 0.15; // snare lives in upper mids
      if (raw.highMids > snareThreshold && raw.highMids > 0.2) {
        snare = true;
        snareEnergy = Math.min(1, raw.highMids);
        this.snareCooldown = 5;
      }
    }

    return { kick, snare, kickEnergy, snareEnergy };
  }

  private updateSmooth(raw: AudioData): AudioData {
    const s = this.smoothing;
    this.smoothData = {
      bass: this.smoothData.bass * s + raw.bass * (1 - s),
      lowMids: this.smoothData.lowMids * s + raw.lowMids * (1 - s),
      highMids: this.smoothData.highMids * s + raw.highMids * (1 - s),
      treble: this.smoothData.treble * s + raw.treble * (1 - s),
      average: this.smoothData.average * s + raw.average * (1 - s),
      kick: raw.kick,
      snare: raw.snare,
      kickEnergy: raw.kickEnergy,
      snareEnergy: raw.snareEnergy,
    };
    return this.smoothData;
  }

  getAudioData(): AudioData {
    if (!this.isPlaying || !this.analyser || this.isSuspended) {
      return { bass: 0, lowMids: 0, highMids: 0, treble: 0, average: 0, kick: false, snare: false, kickEnergy: 0, snareEnergy: 0 };
    }

    const raw = this.getFrequencyData();
    const beats = this.detectBeats(raw);

    return this.updateSmooth({
      ...raw,
      ...beats,
    });
  }

  async startMicrophone(): Promise<void> {
    await this.stop();
    this.currentMode = 'microphone';
    this.lastFile = null;
    await this.resumeContext();
    this.setupAnalyser();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = this.getContext();
    const source = ctx.createMediaStreamSource(stream);
    source.connect(this.analyser!);
    this.source = source;
    this.isPlaying = true;
    this.isSuspended = false;
    this._resetHistory();
  }

  async startFile(file: File): Promise<void> {
    await this.stop();
    this.currentMode = 'file';
    this.lastFile = file;
    await this.resumeContext();
    this.setupAnalyser();

    const arrayBuffer = await file.arrayBuffer();
    const ctx = this.getContext();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0.8;

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    source.connect(this.gainNode);
    this.gainNode.connect(this.analyser!);
    this.gainNode.connect(ctx.destination);
    source.start(0);
    this.source = source;
    this.isPlaying = true;
    this.isSuspended = false;
    this._resetHistory();
  }

  async startDemo(): Promise<void> {
    await this.stop();
    this.currentMode = 'demo';
    this.lastFile = null;
    await this.resumeContext();
    this.setupAnalyser();

    const ctx = this.getContext();
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0.15;
    this.gainNode.connect(this.analyser!);
    this.gainNode.connect(ctx.destination);

    const freqs = [55, 110, 220, 440, 880, 1760];
    const types: OscillatorType[] = ['sine', 'triangle', 'sine', 'sine', 'triangle', 'sine'];

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = types[i];
      osc.frequency.value = freq;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.2 + Math.random() * 1.5;

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = freq * 0.3;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(this.gainNode!);

      osc.start();
      lfo.start();

      const gainLfo = ctx.createOscillator();
      gainLfo.type = 'sine';
      gainLfo.frequency.value = 0.1 + Math.random() * 2;
      const gainLfoAmp = ctx.createGain();
      gainLfoAmp.gain.value = 1 / freqs.length;
      gainLfo.connect(gainLfoAmp);
      gainLfoAmp.connect(gain.gain);
      gainLfo.start();

      this.demoOscillators.push(osc);
      this.demoOscillators.push(lfo);
      this.demoOscillators.push(gainLfo);
      this.demoGains.push(gain);
      this.demoGains.push(lfoGain);
      this.demoGains.push(gainLfoAmp);
    });

    this.isPlaying = true;
    this.isSuspended = false;
    this._resetHistory();
  }

  async pause(): Promise<void> {
    if (!this.isPlaying) return;
    this.isSuspended = true;
    await this.suspendContext();
    this.smoothData = { bass: 0, lowMids: 0, highMids: 0, treble: 0, average: 0, kick: false, snare: false, kickEnergy: 0, snareEnergy: 0 };
  }

  async resume(): Promise<void> {
    if (!this.isPlaying) {
      if (this.currentMode === 'demo') {
        await this.startDemo();
      } else if (this.currentMode === 'file' && this.lastFile) {
        await this.startFile(this.lastFile);
      } else if (this.currentMode === 'microphone') {
        await this.startMicrophone();
      }
      return;
    }
    this.isSuspended = false;
    await this.resumeContext();
  }

  async stop() {
    this.isPlaying = false;
    this.isSuspended = false;
    this.currentMode = null;
    this.lastFile = null;

    if (this.source) {
      try { if ('stop' in this.source) this.source.stop(); } catch (e) {}
      try { if ('disconnect' in this.source) this.source.disconnect(); } catch (e) {}
      this.source = null;
    }

    this.demoOscillators.forEach(o => { try { o.stop(); o.disconnect(); } catch (e) {} });
    this.demoGains.forEach(g => { try { g.disconnect(); } catch (e) {} });
    this.demoOscillators = [];
    this.demoGains = [];

    if (this.gainNode) {
      try { this.gainNode.disconnect(); } catch (e) {}
      this.gainNode = null;
    }

    this.smoothData = { bass: 0, lowMids: 0, highMids: 0, treble: 0, average: 0, kick: false, snare: false, kickEnergy: 0, snareEnergy: 0 };
    this._resetHistory();
  }

  private _resetHistory() {
    this.bassHistory.fill(0);
    this.bassFluxHistory.fill(0);
    this.historyIdx = 0;
    this.prevBass = 0;
    this.kickCooldown = 0;
    this.snareCooldown = 0;
  }

  isActive() {
    return this.isPlaying;
  }
}
