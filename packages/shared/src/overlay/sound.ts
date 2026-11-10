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

  /** Route output to a specific device (Chromium/WebView2 AudioContext.setSinkId). "" = default. */
  async setSink(deviceId: string | null) {
    const ctx = this.ctx as AudioContext & { setSinkId?: (id: string) => Promise<void> };
    if (ctx.setSinkId) await ctx.setSinkId(deviceId ?? "").catch(() => {});
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

  /**
   * Moom's default alert, for the spider: little legs going "tik-tik-tik" up the wall,
   * then one plucked web string, "doing~", wobbling as it rings out. 8-bit, about 0.7 s.
   */
  spider(): Promise<void> {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + 0.02;

    // Six quick steps, alternating feet, climbing a little.
    const steps = [1500, 1850, 1600, 1950, 1700, 2100];
    steps.forEach((f, i) => {
      const at = t0 + i * 0.038;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(f, at);
      env.gain.setValueAtTime(0.2, at);
      env.gain.exponentialRampToValueAtTime(0.001, at + 0.022);
      osc.connect(env).connect(this.master);
      osc.start(at);
      osc.stop(at + 0.03);
      this.track(osc);
    });

    // The web string: a pluck that sags in pitch, with a fast wobble (vibrato).
    const at = t0 + steps.length * 0.038 + 0.05;
    const len = 0.42;
    const string = (type: OscillatorType, mult: number, gain: number) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(880 * mult, at);
      osc.frequency.exponentialRampToValueAtTime(660 * mult, at + 0.12);
      osc.frequency.exponentialRampToValueAtTime(620 * mult, at + len);
      lfo.frequency.value = 16;
      depth.gain.setValueAtTime(0, at);
      depth.gain.linearRampToValueAtTime(22 * mult, at + 0.08);
      lfo.connect(depth).connect(osc.frequency);
      env.gain.setValueAtTime(0, at);
      env.gain.linearRampToValueAtTime(gain, at + 0.006);
      env.gain.exponentialRampToValueAtTime(0.001, at + len);
      osc.connect(env).connect(this.master);
      osc.start(at);
      lfo.start(at);
      osc.stop(at + len + 0.02);
      lfo.stop(at + len + 0.02);
      this.track(osc);
      this.track(lfo);
    };
    string("triangle", 1, 0.22);
    string("square", 2, 0.035); // a thin 8-bit edge an octave up

    const end = at + len;
    return new Promise((r) => setTimeout(r, (end - ctx.currentTime) * 1000 + 30));
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
    // A slow TTS server must not stall the queue. (No AbortSignal.any: older OBS builds lack it.)
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    const forward = () => ctrl.abort();
    signal?.addEventListener("abort", forward);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok || res.status === 204) return;
      const bytes = await res.arrayBuffer();
      clearTimeout(timer);
      return await this.playBytes(bytes, signal);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", forward);
    }
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
      // A suspended context (autoplay blocked) never fires `ended`. Never let sound
      // hold up the queue longer than the clip itself would have taken.
      const guard = setTimeout(resolve, buf.duration * 1000 + 1500);
      src.onended = () => {
        clearTimeout(guard);
        resolve();
      };
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
