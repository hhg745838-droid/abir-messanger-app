// Web Audio API sound generator for ringtones and notifications
class SoundManager {
  private ctx: AudioContext | null = null;
  private ringOscillator1: OscillatorNode | null = null;
  private ringOscillator2: OscillatorNode | null = null;
  private ringInterval: number | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Play outgoing ringing tone (intermittent North American dual tone: 440Hz + 480Hz)
  playOutgoingRing() {
    this.stopRinging();
    try {
      const playBeep = () => {
        const ctx = this.getContext();
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.value = 440;
        osc2.frequency.value = 480;

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 1.8);
        osc2.stop(ctx.currentTime + 1.8);
      };

      playBeep();
      this.ringInterval = window.setInterval(playBeep, 4000);
    } catch (e) {
      console.warn('AudioContext playOutgoingRing error:', e);
    }
  }

  // Play incoming ringtone (melodic chime)
  playIncomingRing() {
    this.stopRinging();
    try {
      const playMelody = () => {
        const ctx = this.getContext();
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);

          gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime + i * 0.15);
          osc.stop(ctx.currentTime + i * 0.15 + 0.35);
        });
      };

      playMelody();
      this.ringInterval = window.setInterval(playMelody, 2500);
    } catch (e) {
      console.warn('AudioContext playIncomingRing error:', e);
    }
  }

  stopRinging() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    if (this.ringOscillator1) {
      try { this.ringOscillator1.stop(); } catch {}
      this.ringOscillator1 = null;
    }
    if (this.ringOscillator2) {
      try { this.ringOscillator2.stop(); } catch {}
      this.ringOscillator2 = null;
    }
  }

  // Message sent/received notification pop
  playMessagePop(isIncoming = false) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      const freq = isIncoming ? 880 : 587.33; // A5 or D5
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  }

  // End call disconnect tone
  playEndCallTone() {
    this.stopRinging();
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(160, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }
}

export const soundManager = new SoundManager();
