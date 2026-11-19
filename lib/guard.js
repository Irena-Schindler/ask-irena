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

// Fixed answers are always positive: say what is possible, never a hard "no" (rule from Irena, 19.11.2026).
export const REFUSAL = {
  en: "I love telling you about Irena's projects, her experience and when she is available. What interests you most?",
  de: "Am liebsten erzähle ich Ihnen von Irenas Projekten, ihrer Erfahrung und wann sie verfügbar ist. Was interessiert Sie besonders?",
};
export const UNKNOWN = {
  en: "Irena will be happy to answer that personally. Just book a free 30-minute intro call with the button below the chat, or write to irena@aiden.ae.",
  de: "Das beantwortet Irena Ihnen gern persönlich. Buchen Sie dafür einfach über den Button unter dem Chat ein kostenloses 30-minütiges Kennenlerngespräch oder schreiben Sie an irena@aiden.ae.",
};
export const BUSY = {
  en: "Thanks for your interest! Give me a short break, I'll be back for you in a few minutes.",
  de: "Danke für Ihr Interesse! Gönnen Sie mir eine kurze Pause, in ein paar Minuten bin ich wieder für Sie da.",
};
export const START = {
  en: "Happy to help! Please start the chat with your name and e-mail first.",
  de: "Sehr gern! Starten Sie den Chat bitte kurz mit Ihrem Namen und Ihrer E-Mail-Adresse.",
};
