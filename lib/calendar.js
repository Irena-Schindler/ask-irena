// Intro-call booking against Irena's Microsoft 365 calendar (Microsoft Graph, app-only).
// Needs MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, MS_CALENDAR_USER. Without them inline booking is off
// and the widget falls back to the Microsoft Bookings link.
import { createHash } from "node:crypto";

export const enabled = () => !!(process.env.MS_TENANT_ID && process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET && process.env.MS_CALENDAR_USER);

export const RULES = () => ({
  tz: process.env.BOOKING_TZ || "Europe/Berlin",                       // working hours are defined in this zone
  days: (process.env.BOOKING_DAYS || "1,2,3,4,5").split(",").map(Number), // 1 = Monday … 7 = Sunday
  from: process.env.BOOKING_FROM || "09:00",
  to: process.env.BOOKING_TO || "17:00",
  minutes: 30, bufferMin: 10,
  leadHours: Number(process.env.BOOKING_LEAD_HOURS || 12),
  horizonDays: Number(process.env.BOOKING_HORIZON_DAYS || 14),
  maxPerDay: Number(process.env.BOOKING_MAX_PER_DAY || 4),
});

// --- time zone helpers (no dependencies) ---
function offsetMs(utcMs, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utcMs;
}
export function zonedToUtc(y, m, d, hh, mm, tz) {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let t = guess - offsetMs(guess, tz);
  t = guess - offsetMs(t, tz);                                         // second pass handles DST edges
  return t;
}
function localDate(utcMs, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })
    .formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, wd: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday) + 1 };
}
export const validTz = (tz) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return typeof tz === "string" && tz.length < 60; } catch { return false; } };

// Pure: candidate slots minus busy intervals. busy = [{start, end}] in UTC ms.
export function freeSlots(busy, now = Date.now(), r = RULES()) {
  const [fh, fm] = r.from.split(":").map(Number), [th, tm] = r.to.split(":").map(Number);
  const step = r.minutes * 60000, buf = r.bufferMin * 60000, earliest = now + r.leadHours * 3600000;
  const out = [];
  for (let i = 0; i <= r.horizonDays; i++) {
    const day = localDate(now + i * 86400000, r.tz);
    if (!r.days.includes(day.wd)) continue;
    const dayStart = zonedToUtc(day.y, day.m, day.d, fh, fm, r.tz), dayEnd = zonedToUtc(day.y, day.m, day.d, th, tm, r.tz);
    const taken = busy.filter((b) => b.end > dayStart - 86400000 && b.start < dayEnd + 86400000);
    let count = 0;
    for (let s = dayStart; s + step <= dayEnd && count < r.maxPerDay; s += step) {
      if (s < earliest) continue;
      if (taken.some((b) => b.start < s + step + buf && b.end > s - buf)) continue;
      out.push(new Date(s).toISOString()); count++;
    }
  }
  return [...new Set(out)];
}

// --- Microsoft Graph ---
let cached = { token: "", exp: 0 };
async function token(fetchImpl) {
  if (cached.token && cached.exp > Date.now() + 60000) return cached.token;
  const r = await fetchImpl(`https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.MS_CLIENT_ID, client_secret: process.env.MS_CLIENT_SECRET, grant_type: "client_credentials", scope: "https://graph.microsoft.com/.default" }) });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error("graph token failed: " + (j.error_description || r.status));
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in || 3000) * 1000 };
  return cached.token;
}
async function graph(path, body, fetchImpl) {
  const r = await fetchImpl(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(process.env.MS_CALENDAR_USER)}${path}`, {
    method: "POST", headers: { authorization: `Bearer ${await token(fetchImpl)}`, "content-type": "application/json", prefer: 'outlook.timezone="UTC"' },
    body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`graph ${path} ${r.status}: ${j.error?.message || ""}`);
  return j;
}
const utc = (s) => Date.parse(/Z$|[+-]\d\d:\d\d$/.test(s) ? s : s + "Z");

export async function busyTimes(fromMs, toMs, fetchImpl = fetch) {
  const j = await graph("/calendar/getSchedule", {
    schedules: [process.env.MS_CALENDAR_USER],
    startTime: { dateTime: new Date(fromMs).toISOString().slice(0, 19), timeZone: "UTC" },
    endTime: { dateTime: new Date(toMs).toISOString().slice(0, 19), timeZone: "UTC" },
    availabilityViewInterval: 15 }, fetchImpl);
  return (j.value?.[0]?.scheduleItems || []).filter((x) => x.status !== "free")
    .map((x) => ({ start: utc(x.start.dateTime), end: utc(x.end.dateTime) }));
}

export async function availableSlots(now = Date.now(), fetchImpl = fetch) {
  const r = RULES();
  return freeSlots(await busyTimes(now, now + (r.horizonDays + 1) * 86400000, fetchImpl), now, r);
}

// Creates the Teams meeting in Irena's calendar. The visitor is not added as attendee on purpose:
// they get our own confirmation mail with the join link and an .ics file instead of Outlook's plain invite.
export async function createMeeting({ start, lead, sessionKey, notes }, fetchImpl = fetch) {
  const s = Date.parse(start), e = s + RULES().minutes * 60000;
  const j = await graph("/events", {
    subject: `Kennenlerngespräch: ${lead.name}`,
    body: { contentType: "HTML", content: notes },
    start: { dateTime: new Date(s).toISOString().slice(0, 19), timeZone: "UTC" },
    end: { dateTime: new Date(e).toISOString().slice(0, 19), timeZone: "UTC" },
    isOnlineMeeting: true, onlineMeetingProvider: "teamsForBusiness",
    categories: ["Website-Buchung"], showAs: "busy",
    transactionId: createHash("sha256").update(String(sessionKey)).digest("hex").slice(0, 36),   // one booking per chat session
  }, fetchImpl);
  return { id: j.id, start: s, end: e, joinUrl: j.onlineMeeting?.joinUrl || j.onlineMeetingUrl || "" };
}
