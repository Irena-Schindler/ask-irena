// POST /api/lead {name,email,consent,lang,website?}            -> notifies Irena of a new contact
// POST /api/lead {kind:"transcript", lead, transcript:[...]}    -> sends the conversation after the chat
import { notify, validateLead } from "../lib/lead.js";
import { rateLimited } from "../lib/guard.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0] || "anon";
  if (rateLimited("lead:" + ip, Date.now(), 10)) return res.status(429).json({ ok: false, reason: "rate" });
  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }   // sendBeacon posts text
  const isTranscript = body.kind === "transcript";
  const v = validateLead(isTranscript ? { ...body.lead, consent: true } : body);
  if (!v.ok) return res.status(400).json({ ok: false, reason: v.reason });
  const transcript = Array.isArray(body.transcript) ? body.transcript.filter((m) => m && typeof m.content === "string") : [];
  try { await notify(isTranscript ? "transcript" : "lead", v.lead, transcript); } catch (e) { console.error("lead notify failed", e); }
  res.status(200).json({ ok: true });
}
