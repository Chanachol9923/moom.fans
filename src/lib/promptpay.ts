// Thai PromptPay QR payloads (EMVCo merchant-presented QR, BOT "Tag 29" credit transfer).
// Pure functions so they run anywhere and are easy to test.

export type PromptPayType = "phone" | "national_id" | "ewallet";

const AID_PROMPTPAY = "A000000677010111";

function tlv(tag: string, value: string): string {
  return tag + value.length.toString().padStart(2, "0") + value;
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as required by EMVCo tag 63. */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function normalizePromptPayId(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

/** Best-effort type detection for what a streamer typed into the payout form. */
export function detectPromptPayType(raw: string): PromptPayType | null {
  const id = normalizePromptPayId(raw);
  if (/^0[0-9]{9}$/.test(id)) return "phone";
  if (/^[0-9]{13}$/.test(id)) return "national_id";
  if (/^[0-9]{15}$/.test(id)) return "ewallet";
  return null;
}

export function isValidNationalId(id: string): boolean {
  if (!/^[0-9]{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
}

function accountField(type: PromptPayType, id: string): string {
  switch (type) {
    case "phone":
      // 0812345678 -> 0066812345678
      return tlv("01", ("0066" + id.replace(/^0/, "")).padStart(13, "0"));
    case "national_id":
      return tlv("02", id);
    case "ewallet":
      return tlv("03", id);
  }
}

export function promptPayPayload(opts: {
  type: PromptPayType;
  id: string;
  /** Baht. Omit for a static QR where the payer types the amount. */
  amount?: number;
}): string {
  const id = normalizePromptPayId(opts.id);
  const hasAmount = opts.amount !== undefined;
  if (hasAmount && !(Number.isFinite(opts.amount) && opts.amount! > 0)) {
    throw new Error("PromptPay amount must be a positive number");
  }
  let payload =
    tlv("00", "01") +
    tlv("01", hasAmount ? "12" : "11") +
    tlv("29", tlv("00", AID_PROMPTPAY) + accountField(opts.type, id)) +
    tlv("58", "TH") +
    tlv("53", "764");
  if (hasAmount) payload += tlv("54", opts.amount!.toFixed(2));
  payload += "6304";
  return payload + crc16(payload);
}

/** Masked for display, e.g. 081-xxx-5678. */
export function maskPromptPayId(type: PromptPayType, raw: string): string {
  const id = normalizePromptPayId(raw);
  if (type === "phone") return `${id.slice(0, 3)}-xxx-${id.slice(-4)}`;
  return `${"x".repeat(Math.max(0, id.length - 4))}${id.slice(-4)}`;
}
