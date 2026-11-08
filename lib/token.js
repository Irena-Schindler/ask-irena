// Stateless signed tokens (HMAC-SHA256) for the anti-bot challenge and the chat session.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const secret = () => process.env.TOKEN_SECRET || process.env.ANTHROPIC_API_KEY || "dev-secret-not-for-production";
const b64 = (s) => Buffer.from(s).toString("base64url");

export function sign(payload) {
  const body = b64(JSON.stringify(payload));
  return `${body}.${createHmac("sha256", secret()).update(body).digest("base64url")}`;
}

export function verify(token, maxAgeMs, now = Date.now()) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const want = createHmac("sha256", secret()).update(body).digest("base64url");
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  let p; try { p = JSON.parse(Buffer.from(body, "base64url").toString()); } catch { return null; }
  if (typeof p.ts !== "number" || now - p.ts > maxAgeMs || p.ts > now + 60000) return null;
  return p;
}

// Proof of work: sha256(challenge + nonce) must start with `bits` zero bits.
export const POW_BITS = 15;
export function checkPow(challenge, nonce, bits = POW_BITS) {
  if (typeof nonce !== "string" || nonce.length > 20) return false;
  const h = createHash("sha256").update(challenge + nonce).digest();
  let need = bits;
  for (const byte of h) {
    if (need >= 8) { if (byte !== 0) return false; need -= 8; continue; }
    return need === 0 || (byte >> (8 - need)) === 0;
  }
  return true;
}

export async function verifyTurnstile(token, ip, fetchImpl = fetch) {
  if (!process.env.TURNSTILE_SECRET) return true;          // optional second layer
  if (!token) return false;
  const r = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET, response: token, remoteip: ip || "" }) });
  return !!(await r.json()).success;
}
