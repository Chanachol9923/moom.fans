import "server-only";
import { escapeSsml } from "./edge";
import type { TtsProvider, TtsRequest } from "./types";

// Azure AI Speech, the official service behind the same neural voices.
// Free tier (F0): 0.5M characters of neural speech a month.
// Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION (e.g. "southeastasia").

export function azureConfigured(): boolean {
  return Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);
}

export const azureTts: TtsProvider = {
  id: "azure",
  async synthesize({ text, voice, rate = 0, pitch = 0 }: TtsRequest): Promise<Buffer> {
    const region = process.env.AZURE_SPEECH_REGION!;
    const lang = voice.split("-").slice(0, 2).join("-");
    const ssml =
      `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>` +
      `<voice name='${voice}'><prosody pitch='${pitch >= 0 ? "+" : ""}${pitch}Hz' rate='${rate >= 0 ? "+" : ""}${rate}%'>` +
      `${escapeSsml(text)}</prosody></voice></speak>`;
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY!,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "moom",
      },
      body: ssml,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`azure-tts: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) throw new Error("azure-tts: no audio returned");
    return buf;
  },
};
