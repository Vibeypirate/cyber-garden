import type { AudioData } from './types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | MediaStreamAudioSourceNode | OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private dataArray: Uint8Array = new Uint8Array(0);
  private smoothData: AudioData = { bass: 0, lowMids: 0, highMids: 0, treble: 0, average: 0 };
  private smoothing = 0.85; // Higher = smoother, lower = more reactive
  private isPlaying = false;
  private demoOscillators: OscillatorNode[] = [];
  private demoGains: GainNode[] = [];

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

  async resume() {
    await this.resumeContext();
  }

  private setupAnalyser() {
    const ctx = this.getContext();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.6;
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength) as Uint8Array;
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
      return count > 0 ? sum / count / 255 : 0; // Normalise to 0–1
    };

    const bass = getBand(20, 150);
    const lowMids = getBand(150, 500);
    const highMids = getBand(500, 2000);
    const treble = getBand(2000, 8000);
    const average = (bass + lowMids + highMids + treble) / 4;

    return { bass, lowMids, highMids, treble, average };
  }

  private updateSmooth() {
    const raw = this.getFrequencyData();
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
    if (!this.isPlaying || !this.analyser) {
      return this.smoothData;
    }
    return this.updateSmooth();
  }

  async startMicrophone(): Promise<void> {
    await this.stop();
    await this.resume();
    this.setupAnalyser();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = this.getContext();
    const source = ctx.createMediaStreamSource(stream);
    source.connect(this.analyser!);
    this.source = source;
    this.isPlaying = true;
  }

  async startFile(file: File): Promise<void> {
    await this.stop();
    await this.resume();
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
  }

  async startDemo(): Promise<void> {
    await this.stop();
    await this.resume();
    this.setupAnalyser();

    const ctx = this.getContext();
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0.15;
    this.gainNode.connect(this.analyser!);
    this.gainNode.connect(ctx.destination);

    // Create multiple oscillators simulating a synthetic evolving signal
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

      // Animate gain with another LFO for rhythmic feel
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
  }

  async stop() {
    this.isPlaying = false;

    if (this.source) {
      try {
        if ('stop' in this.source) this.source.stop();
      } catch (e) { /* noop */ }
      try {
        if ('disconnect' in this.source) this.source.disconnect();
      } catch (e) { /* noop */ }
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
  }

  setSmoothing(val: number) {
    this.smoothing = Math.max(0, Math.min(0.99, val));
  }

  isActive() {
    return this.isPlaying;
  }
}
