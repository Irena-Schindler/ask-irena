// Local preview without Vercel: node dev-server.js -> http://localhost:3000
import http from "node:http";
import { readFile } from "node:fs/promises";
import handler from "./api/chat.js";
import lead from "./api/lead.js";
import config from "./api/settings.js";
import booking from "./api/booking.js";

http.createServer(async (req, res) => {
  const api = { "/api/chat": handler, "/api/lead": lead, "/api/settings": config, "/api/booking": booking }[req.url];
  if (api) {
    let raw = ""; for await (const c of req) raw += c;
    try { req.body = JSON.parse(raw || "{}"); } catch { req.body = raw; }
    const shim = { status(c) { res.statusCode = c; return shim; }, setHeader(k, v) { res.setHeader(k, v); }, json(o) { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(o)); } };
    // MOCK_GRAPH=1: fake Microsoft calendar + mail for local click-testing (never used on Vercel)
    if (process.env.MOCK_GRAPH && req.url === "/api/booking") return api(req, shim, { fetch: async (url, o) => {
      if (url.includes("oauth2")) return { ok: true, json: async () => ({ access_token: "dev", expires_in: 3600 }) };
      if (url.includes("getSchedule")) return { ok: true, json: async () => ({ value: [{ scheduleItems: [] }] }) };
      if (url.endsWith("/events")) return { ok: true, json: async () => ({ id: "dev", onlineMeeting: { joinUrl: "https://teams.microsoft.com/l/meetup-join/dev" } }) };
      console.log("MOCK MAIL", JSON.parse(o.body).subject); return { ok: true, json: async () => ({}) };
    } });
    return api(req, shim);
  }
  let file = req.url.split("?")[0].slice(1); if (file === "" || file.endsWith("/")) file += "index.html";
  try { const b = await readFile(new URL(`./public/${file}`, import.meta.url)); res.end(b); }
  catch { res.statusCode = 404; res.end("not found"); }
}).listen(3000, () => console.log("http://localhost:3000"));
