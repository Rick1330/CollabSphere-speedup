import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const NONCE_BYTES = 16;
const NONCE_HEX_LEN = NONCE_BYTES * 2;

const statePayload = (nonce: string) => `google_oauth|${nonce}`;

/** Signed OAuth2 `state` so callback validation does not rely on cookies (localhost vs 127.0.0.1 mismatch). */
export function createSignedGoogleOAuthState(secret: string): string {
  const nonce = randomBytes(NONCE_BYTES).toString("hex");
  const sig = createHmac("sha256", secret).update(statePayload(nonce)).digest("base64url");
  return `${nonce}.${sig}`;
}

export function verifySignedGoogleOAuthState(secret: string, state: string): boolean {
  const dot = state.indexOf(".");
  if (dot !== NONCE_HEX_LEN) return false;
  const nonce = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  if (!/^[0-9a-f]{32}$/i.test(nonce) || sig.length < 8) return false;
  const expected = createHmac("sha256", secret).update(statePayload(nonce)).digest("base64url");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
