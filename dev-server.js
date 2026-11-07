// Local preview without Vercel: node dev-server.js -> http://localhost:3000
import http from "node:http";
import { readFile } from "node:fs/promises";
import handler from "./api/chat.js";

http.createServer(async (req, res) => {
  if (req.url === "/api/chat") {
    let raw = ""; for await (const c of req) raw += c;
    req.body = JSON.parse(raw || "{}");
    const shim = { status(c) { res.statusCode = c; return shim; }, json(o) { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(o)); } };
    return handler(req, shim);
  }
  let file = req.url.split("?")[0].slice(1); if (file === "" || file.endsWith("/")) file += "index.html";
  try { const b = await readFile(new URL(`./public/${file}`, import.meta.url)); res.end(b); }
  catch { res.statusCode = 404; res.end("not found"); }
}).listen(3000, () => console.log("http://localhost:3000"));
