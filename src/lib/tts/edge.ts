import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import WebSocket from "ws";
import type { TtsProvider, TtsRequest } from "./types";

// Unofficial: this talks to the endpoint Microsoft Edge's "Read aloud" uses.
// It has no SLA and its terms are unclear for commercial use, so it sits behind
// the TtsProvider interface and can be swapped for Azure/Google later.

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const CHROMIUM_FULL_VERSION = "143.0.3650.75";
const CHROMIUM_MAJOR = CHROMIUM_FULL_VERSION.split(".")[0];
const WSS_URL =
  "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
const WINDOWS_EPOCH_OFFSET_S = 11644473600n;

/** Sec-MS-GEC token: SHA-256 of (Windows file-time ticks rounded down to 5 min + client token). */
export function secMsGec(nowMs: number = Date.now()): string {
  let seconds = BigInt(Math.floor(nowMs / 1000)) + WINDOWS_EPOCH_OFFSET_S;
  seconds -= seconds % 300n;
  const ticks = seconds * 10_000_000n;
  return createHash("sha256")
    .update(`${ticks}${TRUSTED_CLIENT_TOKEN}`, "ascii")
    .digest("hex")
    .toUpperCase();
}

export function escapeSsml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function timestamp(): string {
  return new Date().toUTCString().replace("GMT", "GMT+0000 (Coordinated Universal Time)");
}

function connectionId(): string {
  return randomUUID().replace(/-/g, "");
}

export const edgeTts: TtsProvider = {
  id: "edge",
  synthesize({ text, voice, rate = 0, pitch = 0 }: TtsRequest): Promise<Buffer> {
    const url =
      `${WSS_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
      `&Sec-MS-GEC=${secMsGec()}&Sec-MS-GEC-Version=1-${CHROMIUM_FULL_VERSION}` +
      `&ConnectionId=${connectionId()}`;

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url, {
        headers: {
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
          Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
          "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR}.0.0.0`,
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          Cookie: `muid=${randomBytes(16).toString("hex").toUpperCase()};`,
        },
      });

      const chunks: Buffer[] = [];
      const timer = setTimeout(() => {
        ws.terminate();
        reject(new Error("edge-tts: timed out"));
      }, 15_000);

      const fail = (err: Error) => {
        clearTimeout(timer);
        ws.terminate();
        reject(err);
      };

      ws.on("open", () => {
        ws.send(
          `X-Timestamp:${timestamp()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
            JSON.stringify({
              context: {
                synthesis: {
                  audio: {
                    metadataoptions: {
                      sentenceBoundaryEnabled: "false",
                      wordBoundaryEnabled: "false",
                    },
                    outputFormat: "audio-24khz-48kbitrate-mono-mp3",
                  },
                },
              },
            }),
        );
        const ssml =
          `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
          `<voice name='${voice}'><prosody pitch='${pitch >= 0 ? "+" : ""}${pitch}Hz' rate='${rate >= 0 ? "+" : ""}${rate}%' volume='+0%'>` +
          `${escapeSsml(text)}</prosody></voice></speak>`;
        ws.send(
          `X-RequestId:${connectionId()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp()}Z\r\nPath:ssml\r\n\r\n${ssml}`,
        );
      });

      ws.on("message", (data, isBinary) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        if (isBinary) {
          const headerLength = buf.readUInt16BE(0);
          const header = buf.subarray(2, 2 + headerLength).toString("utf8");
          if (header.includes("Path:audio")) chunks.push(buf.subarray(2 + headerLength));
          return;
        }
        if (buf.toString("utf8").includes("Path:turn.end")) {
          clearTimeout(timer);
          ws.close();
          if (chunks.length === 0) reject(new Error("edge-tts: no audio returned"));
          else resolve(Buffer.concat(chunks));
        }
      });

      ws.on("unexpected-response", (_req, res) =>
        fail(new Error(`edge-tts: handshake rejected (${res.statusCode})`)),
      );
      ws.on("error", fail);
    });
  },
};
