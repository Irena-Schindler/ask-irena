// POST /api/lead {name,email,consent,lang,website?,challenge,nonce,turnstile?} -> {ok, chatToken}
// POST /api/lead {kind:"transcript", chatToken, transcript:[...]}              -> sends the conversation to Irena
import { notify, validateLead } from "../lib/lead.js";
import { rateLimited } from "../lib/guard.js";
import { checkPow, sign, verify, verifyTurnstile } from "../lib/token.js";

export const MIN_FILL_MS = 2000;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0] || "anon";
  if (rateLimited("lead:" + ip, Date.now(), 10)) return res.status(429).json({ ok: false, reason: "rate" });
  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }   // sendBeacon posts text

  if (body.kind === "transcript") {
    const session = verify(body.chatToken, 24 * 3600 * 1000);
    if (!session) return res.status(401).json({ ok: false, reason: "token" });
    const transcript = Array.isArray(body.transcript) ? body.transcript.filter((m) => m && typeof m.content === "string") : [];
    try { await notify("transcript", session.lead, transcript); } catch (e) { console.error("transcript notify failed", e); }
    return res.status(200).json({ ok: true });
  }

  const ch = verify(body.challenge, 10 * 60 * 1000);
  const why = !body.challenge ? "no-challenge" : !ch ? "challenge-invalid-or-expired" : Date.now() - ch.ts < MIN_FILL_MS ? "too-fast"
    : !checkPow(body.challenge, body.nonce) ? "pow" : !(await verifyTurnstile(body.turnstile, ip)) ? "turnstile" : "";
  if (why) { console.warn("LEAD rejected", why, ip); return res.status(403).json({ ok: false, reason: "bot" }); }
  const v = validateLead(body);
  if (!v.ok) return res.status(400).json({ ok: false, reason: v.reason });
  try { await notify("lead", v.lead, []); } catch (e) { console.error("lead notify failed", e); }
  res.status(200).json({ ok: true, chatToken: sign({ ts: Date.now(), lead: v.lead }) });
}
