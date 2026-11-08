import { test } from "node:test";
import assert from "node:assert/strict";
import { freeSlots, zonedToUtc } from "../lib/calendar.js";
import { icsFile, renderBooking } from "../lib/lead.js";
import { sign } from "../lib/token.js";
import booking from "../api/booking.js";

const R = { tz: "Europe/Berlin", days: [1, 2, 3, 4, 5], from: "09:00", to: "12:00", minutes: 30, bufferMin: 10, leadHours: 12, horizonDays: 7, maxPerDay: 10 };
const MON = Date.parse("2026-11-09T06:00:00Z");     // Monday 07:00 Berlin

test("time zone conversion handles winter and summer time", () => {
  assert.equal(new Date(zonedToUtc(2026, 11, 10, 9, 0, "Europe/Berlin")).toISOString(), "2026-11-10T08:00:00.000Z");
  assert.equal(new Date(zonedToUtc(2026, 7, 10, 9, 0, "Europe/Berlin")).toISOString(), "2026-07-10T07:00:00.000Z");
});

test("free slots respect lead time, working days, buffers and busy times", () => {
  const busy = [{ start: Date.parse("2026-11-10T09:00:00Z"), end: Date.parse("2026-11-10T09:30:00Z") }]; // Tue 10:00-10:30 Berlin
  const s = freeSlots(busy, MON, R);
  assert.ok(!s.some((x) => x.startsWith("2026-11-09")), "Monday is inside the 12h lead time");
  assert.ok(s.includes("2026-11-10T08:00:00.000Z"));            // Tue 09:00
  assert.ok(!s.includes("2026-11-10T08:30:00.000Z"));           // 09:30 ends 10:00 -> inside 10 min buffer
  assert.ok(!s.includes("2026-11-10T09:00:00.000Z"));           // busy
  assert.ok(!s.includes("2026-11-10T09:30:00.000Z"));           // 10:30 starts right after -> buffer
  assert.ok(s.includes("2026-11-10T10:00:00.000Z"));            // 11:00 ok
  assert.ok(!s.some((x) => x.startsWith("2026-11-14") || x.startsWith("2026-11-15")), "no weekend");
  assert.ok(!s.includes("2026-11-10T11:00:00.000Z"), "12:00 would end after working hours");
});

test("booking mail has Teams button, USPs and no unescaped input", () => {
  const m = { id: "x", start: Date.parse("2026-11-10T08:00:00Z"), end: Date.parse("2026-11-10T08:30:00Z"), joinUrl: "https://teams.microsoft.com/l/meetup-join/abc" };
  const de = renderBooking({ name: "Max <b>Muster</b>", email: "m@x.de", lang: "de" }, m, "Europe/Berlin");
  assert.match(de.html, /An der Besprechung teilnehmen/); assert.match(de.html, /34\.000/); assert.match(de.html, /09:00 MEZ/); assert.match(de.subject, /09:00 Uhr$/);
  assert.ok(!de.html.includes("<b>Muster")); assert.match(de.subject, /Terminbestätigung/);
  const en = renderBooking({ name: "Ann", email: "a@x.com", lang: "en" }, m, "Asia/Dubai");
  assert.match(en.html, /Join the meeting/); assert.match(en.html, /12:00/);
  const ics = icsFile(m, { lang: "de" });
  assert.match(ics, /DTSTART:20261110T080000Z/); assert.match(ics, /URL:https:\/\/teams/);
});

test("booking api: token required, rechecks slot, creates meeting and mails both sides", async () => {
  Object.assign(process.env, { MS_TENANT_ID: "t", MS_CLIENT_ID: "c", MS_CLIENT_SECRET: "s", MS_CALENDAR_USER: "irena@aiden.ae", RESEND_API_KEY: "k", BOOKING_FROM: "09:00", BOOKING_TO: "12:00" });
  const calls = [];
  const f = async (url, o) => {
    calls.push([url, o.body]);
    if (url.includes("oauth2")) return { ok: true, json: async () => ({ access_token: "tok", expires_in: 3600 }) };
    if (url.includes("getSchedule")) return { ok: true, json: async () => ({ value: [{ scheduleItems: [] }] }) };
    if (url.endsWith("/events")) return { ok: true, json: async () => ({ id: "ev1", onlineMeeting: { joinUrl: "https://teams.microsoft.com/l/meetup-join/xyz" } }) };
    return { ok: true, json: async () => ({}) };                // resend
  };
  const call = async (body) => { let st, js; await booking({ method: "POST", body, headers: { "x-forwarded-for": "9.9.9." + Math.random() } },
    { status(s) { st = s; return this; }, json(j) { js = j; return this; } }, { fetch: f, now: MON }); return { st, js }; };
  assert.equal((await call({ action: "slots" })).st, 401);
  const chatToken = sign({ ts: MON, lead: { name: "Max Muster", email: "max@firma.de", lang: "de" } });
  const { js } = await call({ action: "slots", chatToken });
  assert.ok(js.slots.length > 0);
  assert.equal((await call({ action: "book", chatToken, start: "2026-11-10T03:00:00.000Z", tz: "Europe/Berlin" })).st, 409);
  const ok = await call({ action: "book", chatToken, start: js.slots[0], tz: "Europe/Berlin" });
  assert.equal(ok.st, 200); assert.match(ok.js.joinUrl, /teams/);
  const ev = JSON.parse(calls.find(([u]) => u.endsWith("/events"))[1]);
  assert.equal(ev.isOnlineMeeting, true); assert.equal(ev.onlineMeetingProvider, "teamsForBusiness"); assert.equal(ev.attendees, undefined);
  const mails = calls.filter(([u]) => u.includes("resend")).map(([, b]) => JSON.parse(b));
  assert.deepEqual(mails.map((m) => m.to[0]).sort(), ["irena@aiden.ae", "max@firma.de"]);
  assert.ok(mails.find((m) => m.to[0] === "max@firma.de").attachments[0].filename.endsWith(".ics"));
  for (const k of ["MS_TENANT_ID", "MS_CLIENT_ID", "MS_CLIENT_SECRET", "MS_CALENDAR_USER", "RESEND_API_KEY", "BOOKING_FROM", "BOOKING_TO"]) delete process.env[k];
});
