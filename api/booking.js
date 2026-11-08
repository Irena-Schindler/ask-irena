// POST /api/booking {action:"slots", chatToken}                       -> {slots:[ISO...]}
// POST /api/booking {action:"book", chatToken, start, tz}             -> {ok, start, joinUrl}
// Only visitors who passed the chat gate (signed chatToken) can see slots or book.
import { availableSlots, createMeeting, enabled, validTz } from "../lib/calendar.js";
import { sendBookingMails } from "../lib/lead.js";
import { rateLimited } from "../lib/guard.js";
import { verify } from "../lib/token.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export default async function handler(req, res, deps = {}) {
  const fetchImpl = deps.fetch || fetch, now = deps.now || Date.now();
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!enabled()) return res.status(503).json({ ok: false, reason: "off" });
  const body = req.body || {};
  const session = verify(body.chatToken, 24 * 3600 * 1000, now);
  if (!session) return res.status(401).json({ ok: false, reason: "token" });
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0] || "anon";

  try {
    if (body.action === "slots") {
      if (rateLimited("slots:" + ip, now, 30)) return res.status(429).json({ ok: false, reason: "rate" });
      return res.status(200).json({ ok: true, slots: await availableSlots(now, fetchImpl) });
    }
    if (body.action === "book") {
      if (rateLimited("book:" + ip, now, 3)) return res.status(429).json({ ok: false, reason: "rate" });
      const tz = validTz(body.tz) ? body.tz : "Europe/Berlin";
      const free = await availableSlots(now, fetchImpl);                       // re-check right before booking
      if (!free.includes(body.start)) return res.status(409).json({ ok: false, reason: "taken", slots: free });
      const lead = session.lead;
      const notes = `<p><b>Gebucht über irena-schindler.com (AIrena)</b></p><p>Name: ${esc(lead.name)}<br>E-Mail: ${esc(lead.email)}<br>Sprache: ${lead.lang}<br>Zeitzone des Gastes: ${esc(tz)}</p><p>Der Gast hat die Bestätigung mit Teams-Link per E-Mail erhalten und ist nicht als Teilnehmer eingetragen.</p>`;
      const m = await createMeeting({ start: body.start, lead, sessionKey: body.chatToken, notes }, fetchImpl);
      await sendBookingMails(lead, m, tz, fetchImpl).catch((e) => console.error("booking mails failed", e));
      return res.status(200).json({ ok: true, start: new Date(m.start).toISOString(), joinUrl: m.joinUrl });
    }
    return res.status(400).json({ ok: false, reason: "action" });
  } catch (e) {
    console.error("booking failed", e.message);
    return res.status(502).json({ ok: false, reason: "calendar" });
  }
}
