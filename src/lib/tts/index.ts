import "server-only";
import { azureConfigured, azureTts } from "./azure";
import { edgeTts } from "./edge";
import type { TtsProvider } from "./types";

/**
 * Azure Speech when it's configured. Otherwise the unofficial Edge "Read aloud"
 * endpoint, which Microsoft can (and does) start refusing at any time; the dashboard
 * warns about that.
 */
export function ttsProvider(): TtsProvider {
  return azureConfigured() ? azureTts : edgeTts;
}

export function ttsIsOfficial(): boolean {
  return azureConfigured();
}

export { alertSpeech } from "@moom/shared/tts";
