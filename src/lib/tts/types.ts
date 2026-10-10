export type TtsRequest = {
  text: string;
  voice: string;
  /** Percent, e.g. -10 for 10% slower. */
  rate?: number;
  /** Hz offset. */
  pitch?: number;
};

export interface TtsProvider {
  id: string;
  /** Returns MP3 bytes. */
  synthesize(req: TtsRequest): Promise<Buffer>;
}

export const TTS_VOICES = [
  { id: "th-TH-PremwadeeNeural", lang: "th", label: "Premwadee (TH, female)" },
  { id: "th-TH-NiwatNeural", lang: "th", label: "Niwat (TH, male)" },
  { id: "en-US-AvaNeural", lang: "en", label: "Ava (EN, female)" },
  { id: "en-US-AndrewNeural", lang: "en", label: "Andrew (EN, male)" },
] as const;

export type TtsVoiceId = (typeof TTS_VOICES)[number]["id"];

export function isTtsVoice(v: string): v is TtsVoiceId {
  return TTS_VOICES.some((x) => x.id === v);
}
