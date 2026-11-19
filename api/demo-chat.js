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
    body: JSON.stringify({ model: process.env.DEMO_LLM_MODEL || process.env.LLM_MODEL || "claude-haiku-5-5", max_tokens: 700, system: cfg.system, messages: msgs }),
  });
  if (!r.ok) return { answer: "", mode: "faq-fallback" };
  const data = await r.json();
  let text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text || "").join("").trim();
  if (data.stop_reason === "max_tokens") text = trimToSentence(text);
  return text ? { answer: text, mode: "llm" } : { answer: "", mode: "faq-fallback" };
}

export default async function handler(req, res) {
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
