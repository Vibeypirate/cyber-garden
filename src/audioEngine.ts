import type { AudioData } from './types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | MediaStreamAudioSourceNode | OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private dataArray: Uint8Array = new Uint8Array(0);
  private smoothData: AudioData = { bass: 0, lowMids: 0, highMids: 0, treble: 0, average: 0, kick: false, snare: false, kickEnergy: 0, snareEnergy: 0 };
  private smoothing = 0.55;
  private isPlaying = false;
  private isSuspended = false;
  private demoOscillators: OscillatorNode[] = [];
  private demoGains: GainNode[] = [];
  private currentMode: 'file' | 'microphone' | 'demo' | null = null;
  private lastFile: File | null = null;

  // Beat detection: dedicated 0-30Hz sub-bass detection
  private subBassHistory: number[] = new Array(30).fill(0);
  private subBassFluxHistory: number[] = new Array(15).fill(0);
  private snareHistory: number[] = new Array(20).fill(0);
  private historyIdx = 0;
  private prevSubBass = 0;
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
      // 8192 FFT = 4096 bins. At 44.1kHz, each bin is ~5.38Hz wide.
      // Bin 0 = 0-5.38Hz, Bin 1 = 5.38-10.76Hz, ... Bin 5 = 26.91-32.29Hz
      // This gives us precise 0-30Hz sub-bass detection.
      this.analyser.fftSize = 8192;
      this.analyser.smoothingTimeConstant = 0.15;
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

    // 0-30Hz = true sub-bass / kick drum fundamental
    const subBass = getBand(0, 30);
    // 30-120Hz = bass body
    const bass = getBand(30, 120);
    // 120-500Hz = low mids
    const lowMids = getBand(120, 500);
    // 500-5000Hz = snare / clap / vocals
    const highMids = getBand(500, 5000);
    // 5-15kHz = treble
    const treble = getBand(5000, 15000);
    const average = (subBass + bass + lowMids + highMids + treble) / 5;

    return { bass: subBass, lowMids, highMids, treble, average };
  }

  private detectBeats(raw: { bass: number; highMids: number }): { kick: boolean; snare: boolean; kickEnergy: number; snareEnergy: number } {
    // === SUB-BASS FLUX (0-30Hz onset detection) ===
    const subBassFlux = Math.max(0, raw.bass - this.prevSubBass);
    this.prevSubBass = raw.bass;

    this.subBassHistory[this.historyIdx % 30] = raw.bass;
    this.subBassFluxHistory[this.historyIdx % 15] = subBassFlux;
    this.snareHistory[this.historyIdx % 20] = raw.highMids;
    this.historyIdx = (this.historyIdx + 1);

    // Decay cooldowns
    this.kickCooldown = Math.max(0, this.kickCooldown - 1);
    this.snareCooldown = Math.max(0, this.snareCooldown - 1);

    // === COMPUTE AVERAGES ===
    let subSum = 0, fluxSum = 0, snareSum = 0;
    for (let i = 0; i < 30; i++) subSum += this.subBassHistory[i];
    for (let i = 0; i < 15; i++) fluxSum += this.subBassFluxHistory[i];
    for (let i = 0; i < 20; i++) snareSum += this.snareHistory[i];
    const subAvg = subSum / 30;
    const fluxAvg = fluxSum / 15;
    const snareAvg = snareSum / 20;

    // === KICK DETECTION (0-30Hz sub-bass onset) ===
    let kick = false;
    let kickEnergy = 0;
    if (this.kickCooldown === 0) {
      // Very sensitive: sub-bass just needs to spike above average
      // The 0-30Hz band is almost exclusively kick drums
      const subThreshold = subAvg * 1.3 + 0.03;
      const fluxThreshold = fluxAvg * 1.5 + 0.02;

      if (raw.bass > subThreshold && subBassFlux > fluxThreshold) {
        kick = true;
        kickEnergy = Math.min(1, raw.bass * 2 + subBassFlux * 4);
        this.kickCooldown = 4; // ~67ms - tighter for faster songs
      }
    }

    // === SNARE/CLAP DETECTION (500-5000Hz onset) ===
    let snare = false;
    let snareEnergy = 0;
    if (this.snareCooldown === 0) {
      const snareThreshold = snareAvg * 1.4 + 0.08;
      if (raw.highMids > snareThreshold && raw.highMids > 0.15) {
        snare = true;
        snareEnergy = Math.min(1, raw.highMids * 1.5);
        this.snareCooldown = 4;
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
    this.subBassHistory.fill(0);
    this.subBassFluxHistory.fill(0);
    this.snareHistory.fill(0);
    this.historyIdx = 0;
    this.prevSubBass = 0;
    this.kickCooldown = 0;
    this.snareCooldown = 0;
  }

  isActive() {
    return this.isPlaying;
  }
}
