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

const GOLD = "#cda301";
const btn = (href, label) => `<a href="${href}" style="display:inline-block;background:${GOLD};color:#000;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:6px">${label}</a>`;
const AIR = '<span style="color:#a88401;font-weight:bold">AI</span>rena';
const row = (k, v) => `<tr><td style="padding:4px 0;color:#555;width:90px;vertical-align:top">${k}</td><td style="padding:4px 0">${v}</td></tr>`;

export function renderMail(kind, lead, transcript = [], now = new Date()) {
  const subject = kind === "transcript"
    ? `Website-Chat: Verlauf mit ${lead.name}`
    : `Neuer Kontakt über irena-schindler.com: ${lead.name}`;
  const when = now.toLocaleString("de-DE", { timeZone: "Asia/Dubai", dateStyle: "full", timeStyle: "short" }) + " (GST)";
  const reply = `mailto:${esc(lead.email)}?subject=${encodeURIComponent(lead.lang === "de" ? "Ihre Anfrage über irena-schindler.com" : "Your message on irena-schindler.com")}`;
  const msgs = transcript.slice(-30).map((m) => {
    const me = m.role === "user";
    return `<tr><td style="padding:0 0 10px"><div style="font-size:12px;color:#777;margin:0 0 3px">${me ? esc(lead.name) : '<span style="color:#a88401;font-weight:bold">AI</span>rena'}</div>`
      + `<div style="padding:10px 13px;border-radius:8px;white-space:pre-wrap;${me ? "background:#f6f4ee;border:1px solid #ece6d3" : `background:#fff;border:1px solid #ece6d3;border-left:4px solid ${GOLD}`}">${esc(m.content).slice(0, 2000)}</div></td></tr>`;
  }).join("");
  const title = kind === "transcript" ? "Gesprächsverlauf aus dem Website-Chat" : "Neuer Kontakt über Ihre Website";
  const intro = kind === "transcript"
    ? `So lief das Gespräch von ${esc(lead.name)} mit ${AIR}:`
    : `${esc(lead.name)} hat gerade den Chat mit ${AIR} gestartet. Den Gesprächsverlauf bekommen Sie, sobald der Chat geschlossen wird.`;
  const html = `<table style="background:#f6f4ee;padding:24px 0;width:100%"><tbody><tr><td align="center"><table style="max-width:560px;width:100%;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #ece6d3;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;text-align:left"><tbody>`
    + `<tr><td style="padding:20px 28px;border-bottom:4px solid ${GOLD};font-size:18px;font-family:Georgia,serif">Dr. Irena <span style="color:#a88401">Schindler</span></td></tr>`
    + `<tr><td style="padding:26px 28px 8px;font-size:16px;line-height:1.5"><h1 style="margin:0 0 16px;font-size:23px;line-height:1.3">${title}</h1>`
    + `<p style="margin:0 0 12px">${intro}</p>`
    + `<table style="font-size:15px;margin:6px 0 18px"><tbody>${row("Name", `<strong>${esc(lead.name)}</strong>`)}${row("E-Mail", `<a href="mailto:${esc(lead.email)}" style="color:#a88401">${esc(lead.email)}</a>`)}${row("Sprache", lead.lang === "de" ? "Deutsch" : "Englisch")}${row("Zeit", when)}</tbody></table>`
    + (msgs ? `<table style="width:100%;font-size:15px;margin:4px 0 12px"><tbody>${msgs}</tbody></table>` : "")
    + `<p style="margin:0 0 14px">${btn(reply, `${esc(lead.name.split(" ")[0])} antworten`)}</p>`
    + `<p style="margin:0 0 14px;color:#555;font-size:14px">Antworten auf diese E-Mail gehen direkt an ${esc(lead.email)}.</p></td></tr>`
    + `<tr><td style="padding:16px 28px 22px;font-size:12px;color:#777;border-top:1px solid #eee">AIrena · Website-Assistentin von irena-schindler.com</td></tr>`
    + `</tbody></table></td></tr></tbody></table>`;
  return { subject, html };
}

export async function notify(kind, lead, transcript, fetchImpl = fetch) {
  const { subject, html } = renderMail(kind, lead, transcript);
  const sent = [];
  if (process.env.RESEND_API_KEY) {
    const r = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.LEAD_FROM || "AIrena · irena-schindler.com <info@aiden.ae>", to: [process.env.LEAD_TO || "irena@aiden.ae"],
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
