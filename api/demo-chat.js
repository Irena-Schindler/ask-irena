// Vercel serverless function for the client demo chatbots under /demo/*.
// POST /api/demo-chat { bot, message, history? } -> { answer, mode }
// mode "llm": model answer; "faq"/"faq-fallback": no answer here, the page uses its own curated FAQ answers.
import { DEMO_BOTS } from "../lib/demo-bots.js";
import { rateLimited, validate } from "../lib/guard.js";
import { trimToSentence } from "./chat.js";

export async function demoAnswer(bot, message, history = [], fetchImpl = fetch) {
  const cfg = DEMO_BOTS[bot];
  if (!cfg) return { answer: "", mode: "unknown-bot" };
  const v = validate(message);
  if (!v.ok) return { answer: v.reason === "injection" ? cfg.refusal : "", mode: v.reason === "injection" ? "guard" : "faq" };
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { answer: "", mode: "faq" };
  const msgs = history.slice(-8).filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  msgs.push({ role: "user", content: message });
  const r = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    // system as cacheable block: the long product catalogs are billed at the cache rate on follow-up turns
    // Haiku 5.5 thinks adaptively by default (effort "medium"); a chat answer needs little reasoning, and the
    // thinking tokens count against max_tokens, so keep effort low and leave room for thinking plus the answer.
    body: JSON.stringify({ model: process.env.DEMO_LLM_MODEL || process.env.LLM_MODEL || "claude-haiku-5-5", max_tokens: 3000,
      output_config: { effort: "low" },
      system: [{ type: "text", text: cfg.system, cache_control: { type: "ephemeral" } }], messages: msgs }),
  });
  if (!r.ok) {
    // status and error type only, never the visitor's text
    let type = ""; try { type = (await r.json())?.error?.type || ""; } catch {}
    console.error(`demo-chat ${bot}: model API ${r.status} ${type}`);
    return { answer: "", mode: "faq-fallback" };
  }
  const data = await r.json();
  let text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text || "").join("").trim();
  if (data.stop_reason !== "end_turn") console.warn(`demo-chat ${bot}: stop_reason ${data.stop_reason}, ${text.length} chars`);
  if (data.stop_reason === "max_tokens") text = trimToSentence(text);
  return text ? { answer: text, mode: "llm" } : { answer: "", mode: "faq-fallback" };
}

// Demo pages hosted on aiden.ae call this endpoint cross-origin.
export const ALLOWED_ORIGINS = ["https://www.aiden.ae", "https://aiden.ae"];
export function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "Origin");
    res.setHeader("access-control-allow-methods", "POST, OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type");
    res.setHeader("access-control-max-age", "86400");
  }
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  res.setHeader("cache-control", "no-store");
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0] || "anon";
  const { bot, message, history } = req.body || {};
  if (rateLimited("demo:" + ip, Date.now(), 30)) {
    return res.status(429).json({ answer: "Danke für dein Interesse! Gönn mir eine kurze Pause, in ein paar Minuten bin ich wieder für dich da.", mode: "busy" });
  }
  try {
    res.status(200).json(await demoAnswer(String(bot || ""), message, Array.isArray(history) ? history : []));
  } catch {
    res.status(200).json({ answer: "", mode: "error" });
  }
}
