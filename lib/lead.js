// Lead capture: validation and notification (Resend e-mail and/or webhook). No database: the lead goes straight to Irena.
export const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;

export function validateLead(b) {
  const name = typeof b?.name === "string" ? b.name.trim() : "";
  const email = typeof b?.email === "string" ? b.email.trim() : "";
  if (b?.website) return { ok: false, reason: "bot" };            // honeypot field must stay empty
  if (name.length < 2 || name.length > 80 || /[<>{}]/.test(name)) return { ok: false, reason: "name" };
  if (!EMAIL.test(email) || email.length > 120) return { ok: false, reason: "email" };
  if (b?.consent !== true) return { ok: false, reason: "consent" };
  return { ok: true, lead: { name, email, lang: b.lang === "de" ? "de" : "en" } };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function renderMail(kind, lead, transcript = []) {
  const subject = kind === "transcript"
    ? `Website-Chat: Verlauf mit ${lead.name}`
    : `Neuer Kontakt über irena-schindler.com: ${lead.name}`;
  const rows = transcript.slice(-30).map((m) =>
    `<p><b>${m.role === "user" ? esc(lead.name) : "KI"}:</b> ${esc(m.content).slice(0, 2000)}</p>`).join("");
  const html = `<h2>${esc(subject)}</h2><p>Name: ${esc(lead.name)}<br>E-Mail: <a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a><br>Sprache: ${lead.lang}<br>Zeit: ${new Date().toISOString()}</p>${rows || ""}`;
  return { subject, html };
}

export async function notify(kind, lead, transcript, fetchImpl = fetch) {
  const { subject, html } = renderMail(kind, lead, transcript);
  const sent = [];
  if (process.env.RESEND_API_KEY) {
    const r = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.LEAD_FROM || "Website <info@aiden.ae>", to: [process.env.LEAD_TO || "irena@aiden.ae"],
        reply_to: lead.email, subject, html }),
    });
    sent.push(r.ok ? "mail" : "mail-failed");
    if (!r.ok) console.error("RESEND failed", r.status, await r.text?.().catch(() => ""), "LEAD", kind, JSON.stringify(lead));
  }
  if (process.env.LEAD_WEBHOOK_URL) {
    const r = await fetchImpl(process.env.LEAD_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, lead, transcript: transcript.slice(-30) }) });
    sent.push(r.ok ? "webhook" : "webhook-failed");
  }
  if (!sent.length) console.log("LEAD", kind, JSON.stringify(lead));   // visible in Vercel logs until a channel is configured
  return sent;
}
