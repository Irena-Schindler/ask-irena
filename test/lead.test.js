import { test } from "node:test";
import assert from "node:assert/strict";
import { notify, renderMail, validateLead } from "../lib/lead.js";

test("lead validation", () => {
  assert.equal(validateLead({ name: "Max Muster", email: "max@firma.de", consent: true }).ok, true);
  assert.equal(validateLead({ name: "Max", email: "kein-email", consent: true }).reason, "email");
  assert.equal(validateLead({ name: "Max", email: "max@firma.de", consent: false }).reason, "consent");
  assert.equal(validateLead({ name: "M", email: "max@firma.de", consent: true }).reason, "name");
  assert.equal(validateLead({ name: "Max", email: "max@firma.de", consent: true, website: "x" }).reason, "bot");
});

test("mail escapes html and includes transcript", () => {
  const m = renderMail("transcript", { name: "<b>Eve</b>", email: "eve@x.de", lang: "de" }, [{ role: "user", content: "<script>" }]);
  assert.ok(!m.html.includes("<script>") && m.html.includes("&lt;script&gt;") && m.subject.includes("Verlauf"));
});

test("notify uses resend and webhook when configured", async () => {
  process.env.RESEND_API_KEY = "k"; process.env.LEAD_WEBHOOK_URL = "https://hook.example/x";
  const calls = [];
  const f = async (url, o) => { calls.push([url, JSON.parse(o.body)]); return { ok: true }; };
  const sent = await notify("lead", { name: "Max", email: "max@firma.de", lang: "de" }, [], f);
  assert.deepEqual(sent, ["mail", "webhook"]);
  assert.equal(calls[0][1].reply_to, "max@firma.de");
  assert.deepEqual(calls[0][1].to, ["irena@aiden.ae"]);
  delete process.env.RESEND_API_KEY; delete process.env.LEAD_WEBHOOK_URL;
});

test("visitor confirmation is localized and never echoes links from the name", async () => {
  const { renderConfirmation, sendConfirmation } = await import("../lib/lead.js");
  const de = renderConfirmation({ name: "Max Muster", email: "m@x.de", lang: "de" }, "https://book.example/de");
  assert.match(de.html, /Hallo Max,/); assert.match(de.html, /book\.example\/de/); assert.match(de.subject, /Danke/);
  const spam = renderConfirmation({ name: "Win cash www.spam.biz", email: "m@x.de", lang: "en" });
  assert.ok(!spam.html.includes("spam.biz")); assert.match(spam.html, /Hello,/);
  process.env.RESEND_API_KEY = "k"; process.env.BOOKING_URL_EN = "https://book.example/en";
  let sent; await sendConfirmation({ name: "Ann", email: "ann@x.com", lang: "en" }, async (_u, o) => { sent = JSON.parse(o.body); return { ok: true }; });
  assert.deepEqual(sent.to, ["ann@x.com"]); assert.equal(sent.reply_to, "irena@aiden.ae"); assert.match(sent.html, /book\.example\/en/);
  delete process.env.RESEND_API_KEY; delete process.env.BOOKING_URL_EN;
});
