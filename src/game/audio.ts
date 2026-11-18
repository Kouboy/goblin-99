/**
 * Lightweight Web Audio API feedback synthesizer (zero external audio files).
 * Respects mute toggle and silently no-ops if Web Audio is unavailable.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.04, delay = 0) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Ignore audio errors
    }
  }

  step() {
    this.tone(140, 0.045, 'triangle', 0.025);
  }

  bumpWall() {
    this.tone(82, 0.07, 'square', 0.02);
  }

  stamp() {
    this.tone(110, 0.08, 'triangle', 0.05);
    this.tone(180, 0.06, 'sine', 0.03, 0.02);
  }

  coin() {
    this.tone(780, 0.07, 'sine', 0.035);
    this.tone(1040, 0.11, 'sine', 0.03, 0.055);
  }

  alert() {
    this.tone(220, 0.14, 'sawtooth', 0.035);
    this.tone(165, 0.2, 'sawtooth', 0.035, 0.12);
  }

  hurt() {
    this.tone(120, 0.16, 'sawtooth', 0.05);
  }

  pitGaze() {
    // Soft hollow wind & deep distant resonance
    this.tone(98, 0.45, 'sine', 0.022);
    this.tone(146, 0.55, 'triangle', 0.014, 0.08);
  }

  pitClang() {
    // Distant reverberating iron chain clang
    this.tone(310, 0.12, 'triangle', 0.03);
    this.tone(205, 0.36, 'sine', 0.022, 0.06);
  }
}

export const soundFx = new SoundEngine();
