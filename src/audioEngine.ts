import type { AudioData } from './types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | MediaStreamAudioSourceNode | OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private dataArray: Uint8Array = new Uint8Array(0);
  private smoothData: AudioData = { bass: 0, lowMids: 0, highMids: 0, treble: 0, average: 0 };
  private smoothing = 0.82;
  private isPlaying = false;
  private isSuspended = false;
  private demoOscillators: OscillatorNode[] = [];
  private demoGains: GainNode[] = [];
  private currentMode: 'file' | 'microphone' | 'demo' | null = null;
  private lastFile: File | null = null;
  private beatThreshold = 0.55;
  private lastBass = 0;
  private beatCooldown = 0;

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
      this.analyser.smoothingTimeConstant = 0.5;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
    }
  }

  private getFrequencyData(): AudioData {
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

    const bass = getBand(20, 150);
    const lowMids = getBand(150, 500);
    const highMids = getBand(500, 2000);
    const treble = getBand(2000, 8000);
    const average = (bass + lowMids + highMids + treble) / 4;

    return { bass, lowMids, highMids, treble, average };
  }

  private updateSmooth(raw: AudioData): AudioData {
    const s = this.smoothing;
    this.smoothData = {
      bass: this.smoothData.bass * s + raw.bass * (1 - s),
      lowMids: this.smoothData.lowMids * s + raw.lowMids * (1 - s),
      highMids: this.smoothData.highMids * s + raw.highMids * (1 - s),
      treble: this.smoothData.treble * s + raw.treble * (1 - s),
      average: this.smoothData.average * s + raw.average * (1 - s),
    };
    return this.smoothData;
  }

  getAudioData(): AudioData {
    if (!this.isPlaying || !this.analyser || this.isSuspended) {
      return this.smoothData;
    }
    const raw = this.getFrequencyData();

    // Beat detection
    this.beatCooldown -= 0.016;
    const bassDelta = raw.bass - this.lastBass;
    this.lastBass = raw.bass;

    (raw as any).beat = false;
    if (raw.bass > this.beatThreshold && bassDelta > 0.08 && this.beatCooldown <= 0) {
      (raw as any).beat = true;
      this.beatCooldown = 0.25;
    }

    return this.updateSmooth(raw);
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
  }

  async pause(): Promise<void> {
    if (!this.isPlaying) return;
    this.isSuspended = true;
    await this.suspendContext();
  }

  async resume(): Promise<void> {
    if (!this.isPlaying) {
      // If not playing, restart current mode
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

    this.smoothData = { bass: 0, lowMids: 0, highMids: 0, treble: 0, average: 0 };
    this.lastBass = 0;
    this.beatCooldown = 0;
  }

  isActive() {
    return this.isPlaying;
  }
}
