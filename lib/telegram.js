// Telegram-Hinweis an Irena bei einer Buchung über irena-schindler.com (Freigabe Dr. Irena Schindler, 19.11.2026).
// Gleicher Bot und gleiches Format wie im Kundenportal, damit alle Buchungen an einer Stelle ankommen.
// Datensparsam: Telegram speichert außerhalb der EU, daher nur Terminart, Zeit und Vorname, keine E-Mail-Adresse.
// Bot: SCHUTZ_TELEGRAM_TOKEN, Chat: BOOKING_TELEGRAM_CHAT, sonst SCHUTZ_TELEGRAM_CHAT. Fehler ändern nichts an der Buchung.

const zeit = (ms, tz) => new Intl.DateTimeFormat("de-DE", { timeZone: tz, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));

/** Nur der Vorname (erstes Wort), höchstens 40 Zeichen */
export const vorname = (name) => (String(name || "").trim().split(/\s+/)[0] || "").slice(0, 40);

/** Nachrichtentext (rein, testbar) */
export function bookingNotice({ typeName, start, name }) {
  const zeilen = [
    `📅 Neue Buchung: ${String(typeName).slice(0, 80)}`,
    `${zeit(start, "Asia/Dubai")} Uhr (Dubai) / ${zeit(start, "Europe/Berlin")} Uhr (DE)`,
  ];
  const v = vorname(name);
  if (v) zeilen.push(`Gast: ${v}`);
  return zeilen.join("\n");
}

/** Verschickt den Hinweis, wenn Telegram eingerichtet ist; gibt true bei Erfolg zurück */
export async function sendBookingNotice(n, fetchImpl = fetch, env = process.env) {
  const token = env.SCHUTZ_TELEGRAM_TOKEN;
  const chat = env.BOOKING_TELEGRAM_CHAT || env.SCHUTZ_TELEGRAM_CHAT;
  if (!token || !chat) return false;
  try {
    const r = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: bookingNotice(n), disable_web_page_preview: true }),
    });
    if (!r.ok) console.error("Buchungshinweis (Telegram) fehlgeschlagen:", r.status);
    return !!r.ok;
  } catch (e) {
    console.error("Buchungshinweis (Telegram) fehlgeschlagen:", e?.message || e);
    return false;
  }
}
