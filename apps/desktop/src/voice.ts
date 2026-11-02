import { useEffect, useState } from "react";

// Reads alerts aloud with the voices installed on this PC (Windows' own, through the
// webview's speech API). Free, offline and instant; no account or cloud key needed.
// Windows only has a Thai voice once the Thai speech pack is added in Settings.

export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() =>
    typeof speechSynthesis === "undefined" ? [] : speechSynthesis.getVoices(),
  );
  useEffect(() => {
    if (typeof speechSynthesis === "undefined") return;
    const load = () => setVoices(speechSynthesis.getVoices());
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);
  return voices;
}

/**
 * The chosen voice if it's installed and speaks this language, else the best one that
 * does. A Thai voice can't read an English message, so each alert can switch.
 */
export function pickVoice(voices: SpeechSynthesisVoice[], uri: string, lang: string): SpeechSynthesisVoice | null {
  const base = lang.slice(0, 2).toLowerCase();
  const chosen = uri ? voices.find((v) => v.voiceURI === uri) : undefined;
  if (chosen && chosen.lang.toLowerCase().startsWith(base)) return chosen;
  const same = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  // Prefer the newer "Online (Natural)" voices when the system offers them.
  return same.find((v) => /natural/i.test(v.name)) ?? same.find((v) => v.localService) ?? same[0] ?? null;
}

export function hasVoiceFor(voices: SpeechSynthesisVoice[], lang: string) {
  return voices.some((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
}

export type SpeakOptions = { voice: SpeechSynthesisVoice | null; lang: string; rate: number; pitch: number; volume: number };

/** Says `text` and resolves when it's done, fails, or `signal` aborts (which stops it). */
export function speakLocal(text: string, o: SpeakOptions, signal?: AbortSignal): Promise<void> {
  if (typeof speechSynthesis === "undefined" || !text.trim()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    if (o.voice) u.voice = o.voice;
    u.lang = o.voice?.lang ?? o.lang;
    u.rate = o.rate;
    u.pitch = o.pitch;
    u.volume = Math.max(0, Math.min(1, o.volume / 100));
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(guard);
      signal?.removeEventListener("abort", stop);
      resolve();
    };
    const stop = () => {
      speechSynthesis.cancel();
      finish();
    };
    // Some engines never fire "end"; don't hold the alert queue forever.
    const guard = setTimeout(stop, 4000 + ([...text].length * 220) / o.rate);
    u.onend = finish;
    u.onerror = finish;
    signal?.addEventListener("abort", stop);
    speechSynthesis.cancel(); // one voice at a time
    speechSynthesis.speak(u);
    keep.add(u);
    void Promise.resolve().then(() => setTimeout(() => keep.delete(u), 120_000));
  });
}

// Chromium can garbage-collect an utterance mid-sentence and drop its "end" event.
const keep = new Set<SpeechSynthesisUtterance>();
