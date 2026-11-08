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

// ---- Booking: confirmation for the visitor (with .ics) and notice for Irena ----
const fmtWhen = (ms, tz, de, zone = true) => new Date(ms).toLocaleString(de ? "de-DE" : "en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", ...(zone ? { timeZoneName: "short" } : {}) })
  + (de && !zone ? " Uhr" : "");

export function icsFile(m, lead) {
  const d = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const t = (s) => String(s).replace(/[\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const de = lead.lang === "de";
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//irena-schindler.com//booking//EN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${t(m.id || d(m.start))}@irena-schindler.com`, `DTSTAMP:${d(Date.now())}`, `DTSTART:${d(m.start)}`, `DTEND:${d(m.end)}`,
    `SUMMARY:${t(de ? "Kennenlerngespräch mit Dr. Irena Schindler" : "Intro call with Dr. Irena Schindler")}`,
    "LOCATION:Microsoft Teams", m.joinUrl ? `URL:${m.joinUrl}` : "", `DESCRIPTION:${t((de ? "Teams-Link: " : "Teams link: ") + (m.joinUrl || "-"))}`,
    "ORGANIZER;CN=Dr. Irena Schindler:mailto:irena@aiden.ae", "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n");
}

const USP = {
  de: [
    ["KI, die im Alltag läuft", "Ich baue und betreibe KI-Telefon- und Chat-Assistenten, die für Unternehmen in Deutschland, Österreich und der Schweiz täglich echte Kundengespräche führen."],
    ["Messbare Ergebnisse", "Mein KI-Assistent im 1st-Level-Support bei Konica Minolta spart allein in Deutschland 34.000 € pro Monat."],
    ["Konzernerfahrung", "Über sieben Jahre in Großunternehmen, zuletzt als Lead Data Scientist mit eigenem Team bei der Volkswagen AG."],
    ["Wissenschaftlich fundiert", "Promovierte Informatikerin und Dozentin für Machine Learning: gründlich im Denken, schnell in der Umsetzung."],
    ["Sicher von Anfang an", "Schutzmechanismen, Tests und DSGVO gehören bei mir zum Standard. Beispiele liegen offen auf GitHub."],
    ["Zweisprachig und flexibel", "Deutsch und Englisch, remote weltweit, mit voller Überschneidung zu den deutschen Bürozeiten."],
  ],
  en: [
    ["AI that runs in daily operation", "I build and operate AI phone and chat assistants that handle real customer conversations every day for companies in Germany, Austria and Switzerland."],
    ["Measurable results", "My AI assistant in first-level support at Konica Minolta saves €34,000 per month in Germany alone."],
    ["Enterprise experience", "More than seven years in large companies, most recently Lead Data Scientist with my own team at Volkswagen AG."],
    ["Scientific depth", "PhD in computer science and lecturer in machine learning: thorough thinking, fast delivery."],
    ["Safe by design", "Guardrails, tests and GDPR are part of every project. Examples are open on GitHub."],
    ["Bilingual and flexible", "German and English, remote worldwide, with full overlap with European business hours."],
  ],
};

export function renderBooking(lead, m, tz = "Europe/Berlin") {
  const de = lead.lang === "de";
  const safe = /https?:|www\.|\.[a-z]{2,}\b|@/i.test(lead.name) ? "" : esc(lead.name.split(" ")[0]);
  const when = fmtWhen(m.start, tz, de);
  const T = de ? {
    subject: `Terminbestätigung: Kennenlerngespräch am ${fmtWhen(m.start, tz, true, false)}`,
    h1: "Ihr Termin steht!", hi: safe ? `Hallo ${safe},` : "Guten Tag,",
    p1: "vielen Dank für Ihre Buchung. Ich freue mich auf unser Gespräch!", title: "Kennenlerngespräch (30 Min.)",
    k1: "Termin", k2: "Ort", join: "An der Besprechung teilnehmen", ics: "Die Kalenderdatei finden Sie im Anhang.",
    move: "Termin verschieben oder absagen? Antworten Sie einfach auf diese E-Mail.",
    prep: "Sie müssen nichts vorbereiten. Wenn Sie mögen, notieren Sie sich zwei, drei Aufgaben oder Ideen, bei denen KI Ihnen helfen soll. Dann können wir direkt konkret werden.",
    uspH: "Was Sie von mir erwarten können", bye: "Herzliche Grüße", role: "KI-Engineer · LLM-Agenten, Voice AI &amp; Automatisierung",
    more: `<a href="https://irena-schindler.com/de/fallstudien.html" style="color:#a88401">Fallstudien</a> · <a href="https://github.com/Irena-Schindler" style="color:#a88401">Code auf GitHub</a> · <a href="https://www.linkedin.com/in/dr-irena-schindler-46415417a/" style="color:#a88401">LinkedIn</a>`,
    foot: `Sie erhalten diese E-Mail, weil Sie auf irena-schindler.com einen Termin gebucht haben. <a href="https://irena-schindler.com/datenschutz.html" style="color:#777">Datenschutz</a> · <a href="https://irena-schindler.com/impressum.html" style="color:#777">Impressum</a>`,
  } : {
    subject: `Confirmed: intro call on ${fmtWhen(m.start, tz, false, false)}`,
    h1: "You're booked!", hi: safe ? `Hi ${safe},` : "Hello,",
    p1: "thank you for booking. I'm looking forward to our conversation!", title: "Intro call (30 min)",
    k1: "When", k2: "Where", join: "Join the meeting", ics: "The calendar file is attached.",
    move: "Need to reschedule or cancel? Just reply to this e-mail.",
    prep: "No preparation needed. If you like, jot down two or three tasks or ideas where AI should help you, so we can get specific right away.",
    uspH: "What you can expect from me", bye: "Best regards", role: "AI Engineer · LLM agents, voice AI &amp; automation",
    more: `<a href="https://irena-schindler.com/cases.html" style="color:#a88401">Case studies</a> · <a href="https://github.com/Irena-Schindler" style="color:#a88401">Code on GitHub</a> · <a href="https://www.linkedin.com/in/dr-irena-schindler-46415417a/" style="color:#a88401">LinkedIn</a>`,
    foot: `You're receiving this e-mail because you booked a call on irena-schindler.com. <a href="https://irena-schindler.com/datenschutz.html" style="color:#777">Privacy</a> · <a href="https://irena-schindler.com/impressum.html" style="color:#777">Legal notice</a>`,
  };
  const usps = USP[de ? "de" : "en"].map(([h, p]) => `<tr><td style="padding:0 10px 12px 0;vertical-align:top;color:${GOLD};font-size:18px;line-height:1.3">&#9670;</td><td style="padding:0 0 12px"><strong>${h}</strong><br><span style="color:#444">${p}</span></td></tr>`).join("");
  const html = `<table style="background:#f6f4ee;padding:24px 0;width:100%"><tbody><tr><td align="center"><table style="max-width:560px;width:100%;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #ece6d3;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;text-align:left"><tbody>`
    + `<tr><td style="padding:20px 28px;border-bottom:4px solid ${GOLD};font-size:18px;font-family:Georgia,serif"><a href="https://irena-schindler.com${de ? "/de/" : "/"}" style="color:#1a1a1a;text-decoration:none">Dr. Irena <span style="color:#a88401">Schindler</span></a></td></tr>`
    + `<tr><td style="padding:26px 28px 8px;font-size:16px;line-height:1.5"><h1 style="margin:0 0 16px;font-size:23px;line-height:1.3">${T.h1}</h1>`
    + `<p style="margin:0 0 12px">${T.hi}</p><p style="margin:0 0 16px">${T.p1}</p>`
    + `<p style="margin:0 0 4px;font-size:18px;font-weight:bold">${T.title}</p>`
    + `<table style="font-size:15px;margin:6px 0 18px"><tbody>${row(T.k1, `<strong>${when}</strong>`)}${row(T.k2, "Microsoft Teams")}</tbody></table>`
    + (m.joinUrl ? `<p style="margin:0 0 14px">${btn(esc(m.joinUrl), T.join)}</p>` : "")
    + `<p style="margin:0 0 6px;color:#555;font-size:14px">${T.ics}</p><p style="margin:0 0 18px;color:#555;font-size:14px">${T.move}</p>`
    + `<p style="margin:0 0 20px">${T.prep}</p>`
    + `<table style="border:1px solid #e6dcc0;border-radius:8px;margin:4px 0 18px;width:100%"><tbody><tr><td style="padding:18px 18px 6px;line-height:1.45;font-size:15px"><p style="margin:0 0 14px;font-weight:bold;font-size:17px">${T.uspH}</p><table><tbody>${usps}</tbody></table></td></tr></tbody></table>`
    + `<p style="margin:0 0 16px;font-size:15px">${T.more}</p>`
    + `<p style="margin:18px 0 0">${T.bye}<br><strong>Dr. Irena Schindler</strong><br><span style="color:#555;font-size:14px">${T.role}</span></p></td></tr>`
    + `<tr><td style="padding:16px 28px 22px;font-size:12px;line-height:1.5;color:#777;border-top:1px solid #eee">${T.foot}</td></tr>`
    + `</tbody></table></td></tr></tbody></table>`;
  return { subject: T.subject, html };
}

export function renderBookingNotice(lead, m) {
  const when = fmtWhen(m.start, "Asia/Dubai", true);
  const subject = `Neuer Termin über irena-schindler.com: ${lead.name}, ${fmtWhen(m.start, "Asia/Dubai", true, false)}`;
  const html = `<table style="background:#f6f4ee;padding:24px 0;width:100%"><tbody><tr><td align="center"><table style="max-width:560px;width:100%;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #ece6d3;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;text-align:left"><tbody>`
    + `<tr><td style="padding:20px 28px;border-bottom:4px solid ${GOLD};font-size:18px;font-family:Georgia,serif">Dr. Irena <span style="color:#a88401">Schindler</span></td></tr>`
    + `<tr><td style="padding:26px 28px 8px;font-size:16px;line-height:1.5"><h1 style="margin:0 0 16px;font-size:23px;line-height:1.3">Neues Kennenlerngespräch gebucht</h1>`
    + `<p style="margin:0 0 12px">${esc(lead.name)} hat nach dem Chat mit ${AIR} einen Termin gebucht. Er steht bereits in Ihrem Kalender, der Gast hat die Bestätigung mit Teams-Link erhalten.</p>`
    + `<table style="font-size:15px;margin:6px 0 18px"><tbody>${row("Name", `<strong>${esc(lead.name)}</strong>`)}${row("E-Mail", `<a href="mailto:${esc(lead.email)}" style="color:#a88401">${esc(lead.email)}</a>`)}${row("Termin", `<strong>${when}</strong>`)}${row("Sprache", lead.lang === "de" ? "Deutsch" : "Englisch")}</tbody></table>`
    + (m.joinUrl ? `<p style="margin:0 0 18px">${btn(esc(m.joinUrl), "Teams-Besprechung öffnen")}</p>` : "")
    + `</td></tr><tr><td style="padding:16px 28px 22px;font-size:12px;color:#777;border-top:1px solid #eee">AIrena · Website-Assistentin von irena-schindler.com</td></tr></tbody></table></td></tr></tbody></table>`;
  return { subject, html };
}

async function resend(payload, fetchImpl) {
  if (!process.env.RESEND_API_KEY) { console.log("BOOKING", payload.subject); return false; }
  const r = await fetchImpl("https://api.resend.com/emails", { method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify(payload) });
  if (!r.ok) console.error("RESEND booking mail failed", r.status, await r.text?.().catch(() => ""));
  return r.ok;
}

export async function sendBookingMails(lead, m, tz, fetchImpl = fetch) {
  const owner = process.env.LEAD_TO || "irena@aiden.ae";
  const guest = renderBooking(lead, m, tz), notice = renderBookingNotice(lead, m);
  const ics = Buffer.from(icsFile(m, lead)).toString("base64");
  return Promise.all([
    resend({ from: process.env.CONFIRM_FROM || "Dr. Irena Schindler <info@aiden.ae>", to: [lead.email], reply_to: owner, subject: guest.subject, html: guest.html,
      attachments: [{ filename: lead.lang === "de" ? "Kennenlerngespraech.ics" : "Intro-call.ics", content: ics }] }, fetchImpl),
    resend({ from: process.env.LEAD_FROM || "AIrena · irena-schindler.com <info@aiden.ae>", to: [owner], reply_to: lead.email, subject: notice.subject, html: notice.html }, fetchImpl),
  ]);
}
