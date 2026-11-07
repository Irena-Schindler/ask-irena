// Input validation, prompt-injection heuristics, language detection, rate limiting, FAQ matching.
import { FAQ } from "./knowledge.js";

export const MAX_LEN = 500;
const INJECTION = /(ignore|disregard|vergiss|ignoriere)\b.{0,40}\b(instruction|prompt|rules|anweisung|regeln)|system prompt|you are now|jailbreak|<\/?(system|assistant)>/i;

export function validate(message) {
  if (typeof message !== "string" || !message.trim()) return { ok: false, reason: "empty" };
  if (message.length > MAX_LEN) return { ok: false, reason: "too_long" };
  if (INJECTION.test(message)) return { ok: false, reason: "injection" };
  return { ok: true };
}

export function lang(text) {
  const de = (text.match(/\b(der|die|das|und|ist|sie|wie|was|wann|ich|nicht|mit|für|haben|können|erfahrung)\b|[äöüß]/gi) || []).length;
  const en = (text.match(/\b(the|and|is|she|how|what|when|have|can|with|for|experience|does|her)\b/gi) || []).length;
  return de > en ? "de" : "en";
}

export function faqAnswer(text) {
  const t = text.toLowerCase();
  let best = null, score = 0;
  for (const f of FAQ) {
    const s = f.k.filter((k) => t.includes(k)).length;
    if (s > score) { best = f; score = s; }
  }
  return best ? best[lang(text)] : null;
}

const hits = new Map();
export function rateLimited(key, now = Date.now(), limit = 20, windowMs = 10 * 60 * 1000) {
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > limit;
}

export const REFUSAL = {
  en: "I can only answer questions about Irena's experience, skills and availability. For anything else, please write to irena@aiden.ae.",
  de: "Ich beantworte nur Fragen zu Irenas Erfahrung, Fähigkeiten und Verfügbarkeit. Für alles andere schreiben Sie bitte an irena@aiden.ae.",
};
export const UNKNOWN = {
  en: "I don't know that. Please ask Irena directly at irena@aiden.ae.",
  de: "Das weiß ich nicht. Bitte fragen Sie Irena direkt unter irena@aiden.ae.",
};
