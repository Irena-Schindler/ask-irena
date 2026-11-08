import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { checkPow, sign, verify } from "../lib/token.js";
import leadHandler from "../api/lead.js";
import chatHandler from "../api/chat.js";
import settingsHandler from "../api/settings.js";

const solve = (c, bits = 15) => { for (let n = 0; ; n++) if (checkPow(c, String(n), bits)) return String(n); };
const call = async (h, body, method = "POST", ip = "1.2.3." + Math.random()) => {
  let status = 200, json;
  const res = { status(s) { status = s; return this; }, json(j) { json = j; return this; }, setHeader() {} };
  await h({ method, body, headers: { "x-forwarded-for": ip } }, res);
  return { status, json };
};

test("signed tokens verify, expire and reject tampering", () => {
  const t = sign({ ts: 1000, x: 1 });
  assert.equal(verify(t, 5000, 2000).x, 1);
  assert.equal(verify(t, 5000, 10000), null);
  assert.equal(verify(t.replace(/.$/, (c) => (c === "A" ? "B" : "A")), 5000, 2000), null);
  assert.equal(verify("garbage", 5000), null);
});

test("proof of work checks leading zero bits", () => {
  const n = solve("abc", 12);
  const h = createHash("sha256").update("abc" + n).digest();
  assert.equal(h[0], 0); assert.equal(h[1] >> 4, 0);
  assert.equal(checkPow("abc", "x".repeat(30), 1), false);
});

test("lead endpoint rejects bots and issues a chat token to humans", async () => {
  const { json: cfg } = await call(settingsHandler, undefined, "GET");
  const lead = { name: "Max Muster", email: "max@firma.de", consent: true, lang: "de" };
  assert.equal((await call(leadHandler, lead)).json.reason, "bot");                       // no challenge
  assert.equal((await call(leadHandler, { ...lead, challenge: cfg.challenge, nonce: solve(cfg.challenge) })).json.reason, "bot"); // too fast
  const old = sign({ ts: Date.now() - 5000, r: "t" });
  assert.equal((await call(leadHandler, { ...lead, challenge: old, nonce: "0" })).status, 403); // wrong nonce (almost surely)
  const ok = await call(leadHandler, { ...lead, challenge: old, nonce: solve(old) });
  assert.equal(ok.status, 200);
  assert.equal(verify(ok.json.chatToken, 60000).lead.email, "max@firma.de");
  assert.equal((await call(leadHandler, { kind: "transcript", transcript: [] })).status, 401);
  assert.equal((await call(leadHandler, { kind: "transcript", chatToken: ok.json.chatToken, transcript: [] })).status, 200);
});

test("chat endpoint requires a chat token", async () => {
  assert.equal((await call(chatHandler, { message: "Is she available?" })).status, 401);
  delete process.env.ANTHROPIC_API_KEY;
  const t = sign({ ts: Date.now(), lead: { name: "Max", email: "m@x.de" } });
  const r = await call(chatHandler, { message: "Is she available?", chatToken: t });
  assert.equal(r.status, 200); assert.match(r.json.answer, /remote/);
});
