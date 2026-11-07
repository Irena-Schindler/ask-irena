# ask-irena

My personal landing page with an **"Ask my AI"** assistant that answers recruiter and client questions
about my experience, strictly from a verified profile.

```
browser ──POST /api/chat──► validate (length, injection) ──► rate limit ──► Claude (profile as only context)
                                       │                                         │
                                       └──► refusal                UNKNOWN ──► "I don't know, ask Irena"
                                                         no key / API error ──► FAQ fallback
```

## Design choices

- **One source of truth:** `lib/knowledge.js` holds every fact the assistant may use; the model is told to answer only from it and to return `UNKNOWN` otherwise.
- **No invented facts:** unknown questions get an explicit "I don't know" with a contact path.
- **Guardrails:** input length limit, prompt-injection heuristics, conversation history capped and sanitised.
- **Cost & abuse control:** per-IP rate limit, small fast model, `max_tokens` cap.
- **Graceful degradation:** without an API key, or if the API fails, a keyword FAQ still answers common questions.
- **Bilingual:** answers in the language of the question (German or English).
- **Privacy:** questions are not stored.

## Run

```bash
npm test                 # node:test, no dependencies
node dev-server.js       # http://localhost:3000 (FAQ mode without ANTHROPIC_API_KEY)
```

Deploy on Vercel: set `ANTHROPIC_API_KEY` (and optionally `LLM_MODEL`) as environment variables.
