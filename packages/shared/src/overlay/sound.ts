// Overlay audio on one AudioContext with a master gain, so the volume slider,
// panic button and TTS all go through the same place.

export class OverlayAudio {
  readonly ctx: AudioContext;
  private master: GainNode;
  private live = new Set<AudioScheduledSourceNode>();

  constructor(volume: number) {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.setVolume(volume);
  }

  get blocked(): boolean {
    return this.ctx.state === "suspended";
  }

  resume() {
    return this.ctx.resume();
  }

  setVolume(percent: number) {
    // Perceptual-ish curve; 0..100 slider.
    const v = Math.max(0, Math.min(100, percent)) / 100;
    this.master.gain.value = v * v;
  }

  stopAll() {
    for (const n of this.live) {
      try {
        n.stop();
      } catch {
        /* already stopped */
      }
    }
    this.live.clear();
  }

  /** Moom's default alert: a two-note 8-bit "coo-coo". */
  chirp(): Promise<void> {
    const t0 = this.ctx.currentTime + 0.02;
    const notes: Array<[number, number, number, number]> = [
      // start Hz, end Hz, at, length
      [620, 880, 0, 0.11],
      [880, 700, 0.14, 0.16],
    ];
    let end = t0;
    for (const [f0, f1, at, len] of notes) {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(f0, t0 + at);
      osc.frequency.exponentialRampToValueAtTime(f1, t0 + at + len);
      env.gain.setValueAtTime(0, t0 + at);
      env.gain.linearRampToValueAtTime(0.22, t0 + at + 0.01);
      env.gain.setValueAtTime(0.22, t0 + at + len - 0.03);
      env.gain.linearRampToValueAtTime(0, t0 + at + len);
      osc.connect(env).connect(this.master);
      osc.start(t0 + at);
      osc.stop(t0 + at + len + 0.02);
      this.track(osc);
      end = Math.max(end, t0 + at + len);
    }
    return new Promise((r) => setTimeout(r, (end - this.ctx.currentTime) * 1000 + 30));
  }

  /** Short blip for the prize wheel passing a slot. */
  tick() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 1200;
    env.gain.setValueAtTime(0.08, t);
    env.gain.linearRampToValueAtTime(0, t + 0.03);
    osc.connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.035);
    this.track(osc);
  }

  async playUrl(url: string, signal?: AbortSignal): Promise<void> {
    const res = await fetch(url, { signal });
    if (!res.ok || res.status === 204) return;
    return this.playBytes(await res.arrayBuffer(), signal);
  }

  async playBytes(bytes: ArrayBuffer, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return;
    const buf = await this.ctx.decodeAudioData(bytes);
    if (signal?.aborted) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    this.track(src);
    return new Promise((resolve) => {
      src.onended = () => resolve();
      signal?.addEventListener("abort", () => {
        try {
          src.stop();
        } catch {
          /* noop */
        }
        resolve();
      });
      src.start();
    });
  }

  private track(n: AudioScheduledSourceNode) {
    this.live.add(n);
    n.addEventListener("ended", () => this.live.delete(n));
  }
}
