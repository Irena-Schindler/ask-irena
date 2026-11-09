// Single source of truth for everything the assistant may say about Irena.
// Facts only. If it is not here, the assistant says it does not know.
export const PROFILE = `
Name: Dr. rer. nat. Irena Schindler. Role: CEO and hands-on AI engineer of her start-up AIDEN in Dubai, as is usual in a start-up: she leads the company and builds LLM agents, voice AI and ML systems herself. Also lead data scientist by background. Available immediately for freelance projects alongside this.
How to introduce her: when asked who she is or what she does, mention both roles together (CEO and AI engineer, hands-on) and that she is available for projects; do not present her only as CEO.
Location and availability: based in Dubai (GMT+4, full overlap with Central European working hours). Available immediately for freelance projects, remote worldwide; on-site only in Dubai/UAE. Part-time (e.g. 3 days per week) or full-time. Rates on request.
Languages: German and English, both fluent.
Experience overall: more than 10 years in machine learning, data science and AI, including 7+ years in large enterprises.
Contact: irena@aiden.ae, LinkedIn linkedin.com/in/dr-irena-schindler-46415417a, GitHub github.com/Irena-Schindler.

Current (since 06/2026): CEO and AI engineer of AIDEN (Dubai), her start-up. Designs, builds and operates AI phone and chat agents that handle real customer calls for companies in Germany, Austria and Switzerland (retail, fitness, services): appointment booking, callbacks, call transfer, SIP telephony, WhatsApp, knowledge bases, a multi-tenant customer portal with versioning and abuse protection, GDPR documentation.
03/2026–10/2026: Lecturer for Machine Learning and Parallel Programming, University of Europe for Applied Sciences, Dubai (part-time).
07/2025–06/2026: CEO and Lead Data Scientist, Future Forge Training (AI and data science trainings, advisory on data-driven CRM, marketing automation, data governance).
02/2022–05/2025: Lead Data Scientist at Volkswagen AG. Led a data science team; predictive maintenance models; enterprise data model; automated data ingestion from multiple sources; CRM system with better customer service and lead conversion; data governance and ethical AI practices; data literacy workshops.
01/2018–01/2022: Senior Data Scientist at Konica Minolta Business Solutions Europe (European headquarters). Built an AI-powered virtual assistant that took over first-level support, saving 34,000 euros per month in the German national organisation alone. Built a forecasting model for cartridge sales with 93 percent accuracy. Mentored junior data scientists.
Education: Dr. rer. nat. (PhD), Leibniz University Hannover, Institute of Theoretical Computer Science, 2013–2017; thesis on parameterized complexity of decision problems in non-classical logics.
Talks: speaker at JETSTREAM (Dirk Kreuter).

Integration work: REST APIs, webhooks, connecting AI agents to CRM, calendars and industry software; quality assurance based on conversation analytics; chat widgets; WhatsApp Business.
This website and AIrena (the assistant answering here) were built by Irena: Claude API (Anthropic), Node.js serverless functions on Vercel, grounded answers with guardrails, bot protection, and intro-call booking via the Microsoft 365 calendar (Microsoft Graph, Teams).
Automation and AI tooling (used in production projects): LangChain, Hugging Face, n8n, Zapier, Make (Make.com), Twilio, ElevenLabs, Supabase, Notion, Resend, Typefully.
Web and cloud: TypeScript, Next.js, Vercel, GitHub, AWS, Google Cloud. Reporting: Power BI.
Regulation: EU AI Act compliance is part of every voice agent project for her clients; she has both practical project experience and in-depth knowledge of the AI Act, alongside GDPR.
Note on tools (internal, never mention this note): Irena works with many more tools than listed. If a tool is not listed, do not say she lacks it.
Employment: her focus is freelance projects. A permanent position is something to discuss with Irena directly.
Skills: Python, FastAPI, SQL, R, LLM agents, tool calling, prompt engineering, RAG, MCP, evaluation and guardrails, voice AI (speech-to-text, text-to-speech, SIP, LiveKit), Qdrant, Langfuse, machine learning, forecasting, predictive modelling, data modelling, data integration, data visualisation, data governance, GDPR, Docker, GitHub Actions, AWS, Salesforce, team leadership, stakeholder management, teaching.

Open-source portfolio on GitHub: appointment-agent (typed tool calling, prompt-injection guardrails, PII-safe logging, regression evals, FastAPI, Docker, CI); voice-receptionist (German voice agent on LiveKit, STT to LLM with tools to TTS, SIP-ready); rag-with-sources (RAG on Qdrant with verified citations, refusal path, Langfuse tracing, retrieval evals); mcp-calendar-server (MCP server over a REST API with idempotency and safety annotations); demand-forecasting (gradient boosting vs seasonal baseline, 93 vs 85 percent accuracy on synthetic data); ask-irena (this assistant).
Good fit: turning an AI prototype into a reliable product, voice and chat agents, LLM integration into existing systems, AI strategy and data science leadership, trainings.
`;

// Offline answers when no LLM key is configured, and the fast path for common questions.
export const FAQ = [
  { k: ["available", "availability", "start", "verfügbar", "wann", "when", "remote", "onsite", "on-site", "vor ort"],
    en: "Irena is available immediately for freelance projects, remote worldwide (GMT+4, full overlap with CET). On-site work is possible in Dubai/UAE. Part-time or full-time.",
    de: "Irena ist ab sofort für Freelance-Projekte verfügbar, remote weltweit (GMT+4, volle Überschneidung mit MEZ). Vor Ort ist sie in Dubai/VAE einsetzbar. Teilzeit oder Vollzeit." },
  { k: ["voice", "phone", "telefon", "call", "sip", "livekit", "anruf"],
    en: "Irena designs, builds and operates AI phone agents in live customer operations for companies in DACH: appointment booking, callbacks, transfers, SIP telephony. A public example is github.com/Irena-Schindler/voice-receptionist.",
    de: "Irena entwickelt und betreibt KI-Telefonassistenten im Live-Betrieb für Unternehmen in DACH: Terminbuchung, Rückrufe, Weiterleitung, SIP-Telefonie. Ein öffentliches Beispiel: github.com/Irena-Schindler/voice-receptionist." },
  { k: ["volkswagen", "vw", "lead", "team"],
    en: "At Volkswagen AG (2022–2025) Irena was Lead Data Scientist: she led a data science team and delivered predictive maintenance models, an enterprise data model and a CRM system with better lead conversion.",
    de: "Bei der Volkswagen AG (2022–2025) war Irena Lead Data Scientist: Sie leitete ein Data-Science-Team und lieferte Predictive-Maintenance-Modelle, ein unternehmensweites Datenmodell und ein CRM-System mit höherer Lead-Conversion." },
  { k: ["konica", "minolta", "34", "support", "assistant", "assistent", "savings", "einsparung"],
    en: "At Konica Minolta Business Solutions Europe Irena built an AI virtual assistant that took over first-level support, saving 34,000 euros per month in Germany alone, and a cartridge sales forecast with 93% accuracy.",
    de: "Bei Konica Minolta Business Solutions Europe baute Irena einen KI-Assistenten für den 1st-Level-Support, der allein in Deutschland 34.000 € pro Monat einspart, und eine Absatzprognose mit 93 % Genauigkeit." },
  { k: ["rate", "price", "cost", "stundensatz", "preis", "kosten", "honorar"],
    en: "Rates depend on scope and workload; please contact Irena directly at irena@aiden.ae.",
    de: "Der Satz hängt von Umfang und Auslastung ab; bitte direkt an irena@aiden.ae wenden." },
  { k: ["github", "portfolio", "code", "projects", "projekte", "repo"],
    en: "Irena's open-source portfolio is at github.com/Irena-Schindler: appointment-agent, voice-receptionist, rag-with-sources, mcp-calendar-server and demand-forecasting.",
    de: "Irenas Open-Source-Portfolio liegt auf github.com/Irena-Schindler: appointment-agent, voice-receptionist, rag-with-sources, mcp-calendar-server und demand-forecasting." },
  { k: ["phd", "promotion", "doctor", "education", "studium", "university", "uni", "lecturer", "teaching"],
    en: "Irena holds a PhD (Dr. rer. nat.) in theoretical computer science from Leibniz University Hannover and taught Machine Learning and Parallel Programming at the University of Europe for Applied Sciences in Dubai.",
    de: "Irena ist promovierte Informatikerin (Dr. rer. nat., Leibniz Universität Hannover, Theoretische Informatik) und hat Machine Learning und Parallele Programmierung an der University of Europe for Applied Sciences in Dubai gelehrt." },
  { k: ["contact", "kontakt", "email", "mail", "meeting", "call", "termin", "gespräch", "book"],
    en: "Best way to reach Irena: irena@aiden.ae or LinkedIn (linkedin.com/in/dr-irena-schindler-46415417a). She usually replies within one business day.",
    de: "Am besten erreichen Sie Irena unter irena@aiden.ae oder über LinkedIn (linkedin.com/in/dr-irena-schindler-46415417a). Sie antwortet in der Regel innerhalb eines Werktags." },
];
