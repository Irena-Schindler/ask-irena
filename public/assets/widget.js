// Floating "Ask AIrena" chat widget. Uses the same /api/chat endpoint as the page section.
(() => {
  const de = document.documentElement.lang === 'de';
  const AIR = '<span class="iw-ai">AI</span>rena';
  const T = de ? {title: AIR, sub: 'Irenas KI-Assistentin · online', hi: 'Hallo, ich bin AIrena! Fragen Sie mich nach Irenas Erfahrung, Projekten oder Verfügbarkeit.', ph: 'Ihre Frage …', send: 'Senden', open: 'Frag ' + AIR,
      chips: ['Ist sie verfügbar?', 'Welche Voice-AI-Erfahrung hat sie?', 'Was hat sie bei VW gemacht?'], off: 'Der Assistent ist gerade nicht erreichbar. Bitte schreiben Sie an irena@aiden.ae.',
      gate: 'Kurz vorab: Wie darf ich Sie ansprechen? Irena bekommt Ihren Namen, Ihre E-Mail und den Gesprächsverlauf, damit sie sich persönlich melden kann.', name: 'Name', email: 'E-Mail',
      consent: 'Ich bin einverstanden, dass Name, E-Mail und dieser Chat zur Kontaktaufnahme verarbeitet werden (<a href="/datenschutz.html" target="_blank">Datenschutz</a>).', start: 'Chat starten',
      err: {name: 'Bitte Ihren Namen eingeben.', email: 'Bitte eine gültige E-Mail eingeben.', consent: 'Bitte der Datenverarbeitung zustimmen.', rate: 'Zu viele Versuche, bitte später erneut.', bot: 'Sicherheitsprüfung fehlgeschlagen. Bitte Seite neu laden.'}, check: 'Sicherheitsprüfung läuft …',
      hiName: n => `Hallo ${n}, ich bin AIrena! Fragen Sie mich nach Irenas Erfahrung, Projekten oder Verfügbarkeit.`, book: '📅 Kennenlerngespräch buchen (30 Min.)', bookHint: 'Lust auf ein persönliches Gespräch mit Irena?'}
    : {title: AIR, sub: "Irena's AI assistant · online", hi: "Hi, I'm AIrena! Ask me about Irena's experience, projects or availability – in English or German.", ph: 'Type your question…', send: 'Send', open: 'Ask ' + AIR,
      chips: ['Is she available?', 'What voice AI work has she done?', 'What did she do at Volkswagen?'], off: 'The assistant is offline right now. Please write to irena@aiden.ae.',
      gate: 'Quick intro first: who am I talking to? Irena receives your name, e-mail and this conversation so she can get back to you personally.', name: 'Name', email: 'E-mail',
      consent: 'I agree that my name, e-mail and this chat are processed to contact me (<a href="/datenschutz.html" target="_blank">privacy</a>).', start: 'Start chat',
      err: {name: 'Please enter your name.', email: 'Please enter a valid e-mail.', consent: 'Please accept the data processing.', rate: 'Too many attempts, please try again later.', bot: 'Security check failed. Please reload the page.'}, check: 'Running security check…',
      hiName: n => `Hi ${n}, I'm AIrena! Ask me about Irena's experience, projects or availability.`, book: '📅 Book a 30-min intro call', bookHint: 'Want to talk to Irena in person?'};
  const css = `
  .iw-ai{color:#f2c94c;text-shadow:0 0 10px rgba(242,201,76,.75),0 0 22px rgba(212,169,10,.45);font-weight:800}
  .iw-ts{min-height:0}
  .iw-btn{position:fixed;right:22px;bottom:22px;z-index:9999;display:flex;align-items:center;gap:10px;padding:10px 18px 10px 10px;border-radius:999px;border:1px solid rgba(242,201,76,.6);
    background:#0c0c0f;color:#f4f1e8;font:600 15px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;cursor:pointer;box-shadow:0 10px 40px rgba(212,169,10,.35);animation:iwPulse 2.8s infinite}
  .iw-btn:hover{transform:translateY(-2px)}
  .iw-orb{width:38px;height:38px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f2c94c,#d4a90a 50%,#5a4700);box-shadow:0 0 18px rgba(212,169,10,.7)}
  @keyframes iwPulse{0%{box-shadow:0 0 0 0 rgba(212,169,10,.45),0 10px 40px rgba(212,169,10,.35)}70%{box-shadow:0 0 0 14px rgba(212,169,10,0),0 10px 40px rgba(212,169,10,.35)}100%{box-shadow:0 0 0 0 rgba(212,169,10,0),0 10px 40px rgba(212,169,10,.35)}}
  .iw-panel{position:fixed;right:22px;bottom:90px;z-index:9999;width:min(380px,calc(100vw - 32px));height:min(560px,calc(100vh - 120px));display:none;flex-direction:column;
    background:#0c0c0f;color:#f4f1e8;border:1px solid rgba(212,169,10,.5);border-radius:22px;overflow:hidden;box-shadow:0 0 0 6px rgba(212,169,10,.06),0 30px 90px rgba(0,0,0,.5);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
  .iw-panel.open{display:flex;animation:iwIn .25s ease-out}@keyframes iwIn{from{opacity:0;transform:translateY(12px)}}
  .iw-head{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.09)}
  .iw-head .iw-orb{width:34px;height:34px}.iw-head b{display:block;font-size:15px}.iw-head>div>span{font-size:12px;color:#a9a59a}
  .iw-head>div>span:before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:#4ade80;margin-right:6px;box-shadow:0 0 8px #4ade80}
  .iw-x{margin-left:auto;background:none;border:0;color:#a9a59a;font-size:22px;cursor:pointer;line-height:1}
  .iw-log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
  .iw-m{max-width:85%;padding:10px 13px;border-radius:16px;white-space:pre-wrap}
  .iw-bot{background:#18171b;border:1px solid rgba(255,255,255,.08);align-self:flex-start;border-bottom-left-radius:5px}
  .iw-me{background:#d4a90a;color:#111;align-self:flex-end;border-bottom-right-radius:5px;font-weight:500}
  .iw-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px}
  .iw-chips button{background:none;border:1px solid rgba(212,169,10,.45);color:#e8e2cf;border-radius:999px;padding:6px 11px;font:inherit;font-size:12.5px;cursor:pointer}
  .iw-chips button:hover{background:rgba(212,169,10,.14)}
  .iw-form{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(255,255,255,.09)}
  .iw-form input{flex:1;min-width:0;background:#141317;border:1px solid rgba(255,255,255,.1);border-radius:999px;color:#fff;font:inherit;padding:11px 15px;outline:none}
  .iw-form input:focus{border-color:#d4a90a}
  .iw-form button{background:#d4a90a;color:#111;border:0;border-radius:999px;padding:0 16px;font-weight:700;cursor:pointer}
  .iw-dots{display:inline-flex;gap:4px}.iw-dots i{width:6px;height:6px;border-radius:50%;background:#f2c94c;animation:iwD 1s infinite}.iw-dots i:nth-child(2){animation-delay:.15s}.iw-dots i:nth-child(3){animation-delay:.3s}
  @keyframes iwD{50%{opacity:.25;transform:translateY(-3px)}}
  .iw-gate{flex:1;overflow-y:auto;padding:18px 16px;display:flex;flex-direction:column;gap:10px}
  .iw-gate p{margin:0 0 4px;color:#d9d5ca}
  .iw-gate input[type=text],.iw-gate input[type=email]{background:#141317;border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;font:inherit;padding:11px 13px;outline:none}
  .iw-gate input:focus{border-color:#d4a90a}
  .iw-gate label{display:flex;gap:8px;font-size:12.5px;color:#a9a59a;align-items:flex-start}.iw-gate label a{color:#f2c94c}
  .iw-gate .iw-go{background:#d4a90a;color:#111;border:0;border-radius:999px;padding:12px;font-weight:700;cursor:pointer;margin-top:4px}
  .iw-gate .iw-err{color:#ff8a80;font-size:13px;min-height:18px}
  .iw-hp{position:absolute;left:-9999px}
  .iw-book{display:none;margin:0 16px 10px;padding:12px;border-radius:14px;background:rgba(212,169,10,.1);border:1px solid rgba(212,169,10,.45);text-align:center}
  .iw-book span{display:block;font-size:13px;color:#d9d5ca;margin-bottom:8px}
  .iw-book a{display:inline-block;background:#d4a90a;color:#111;text-decoration:none;font-weight:700;border-radius:999px;padding:10px 16px}
  .iw-chat{display:none;flex:1;flex-direction:column;min-height:0}
  @media (max-width:520px){.iw-btn span{display:none}.iw-btn{padding:8px}.iw-panel{right:16px;bottom:80px}}
  @media (prefers-reduced-motion:reduce){.iw-btn,.iw-panel.open,.iw-dots i{animation:none}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const btn = document.createElement('button'); btn.className = 'iw-btn'; btn.setAttribute('aria-label', de ? 'Frag AIrena' : 'Ask AIrena');
  btn.innerHTML = `<div class="iw-orb"></div><span>${T.open}</span>`;
  const panel = document.createElement('div'); panel.className = 'iw-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'AIrena');
  panel.innerHTML = `<div class="iw-head"><div class="iw-orb"></div><div><b>${T.title}</b><span>${T.sub}</span></div><button class="iw-x" aria-label="close">×</button></div>
    <form class="iw-gate" novalidate><p>${T.gate}</p>
      <input type="text" name="name" autocomplete="name" placeholder="${T.name}" maxlength="80" aria-label="${T.name}">
      <input type="email" name="email" autocomplete="email" placeholder="${T.email}" maxlength="120" aria-label="${T.email}">
      <input class="iw-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <label><input type="checkbox" name="consent"> <span>${T.consent}</span></label>
      <div class="iw-ts"></div>
      <div class="iw-err" aria-live="polite"></div><button class="iw-go">${T.start}</button></form>
    <div class="iw-chat"><div class="iw-log"></div>
      <div class="iw-chips">${T.chips.map(c => `<button>${c}</button>`).join('')}</div>
      <div class="iw-book"><span>${T.bookHint}</span><a target="_blank" rel="noopener">${T.book}</a></div>
      <form class="iw-form"><input maxlength="500" placeholder="${T.ph}" aria-label="${T.ph}"><button>${T.send}</button></form></div>`;
  document.body.append(btn, panel);
  const log = panel.querySelector('.iw-log'), input = panel.querySelector('.iw-form input'), history = [];
  const gate = panel.querySelector('.iw-gate'), chat = panel.querySelector('.iw-chat'), book = panel.querySelector('.iw-book');
  const store = { get: k => { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  let lead = store.get('iw-lead'), bookingUrl = '', sentCount = 0, cfg = null, pow = null, tsToken = '';
  if (lead && !lead.chatToken) lead = null;                     // stored before the bot check existed
  const loadCfg = () => fetch('/api/settings', {cache: 'no-store'}).then(r => r.json()).then(c => { cfg = c; cfg.at = Date.now(); bookingUrl = (de ? c.bookingUrlDe : c.bookingUrlEn) || c.bookingUrl || ''; setBook(); return c; });
  const ready = loadCfg().catch(() => { setBook(); return null; });
  // Proof of work: find a nonce so that sha256(challenge + nonce) starts with `bits` zero bits.
  async function solve(challenge, bits) {
    const enc = new TextEncoder();
    for (let n = 0; n < 5e6; n++) {
      const h = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(challenge + n)));
      let need = bits, ok = true;
      for (const b of h) { if (need >= 8) { if (b) { ok = false; break; } need -= 8; continue; } ok = need === 0 || (b >> (8 - need)) === 0; break; }
      if (ok) return String(n);
    }
    return '';
  }
  function startPow() {
    if (lead) return;
    if (!pow || (cfg && Date.now() - cfg.at > 8 * 60 * 1000)) {
      pow = (cfg && Date.now() - cfg.at < 8 * 60 * 1000 ? Promise.resolve(cfg) : ready.then(c => c && Date.now() - c.at < 8 * 60 * 1000 ? c : loadCfg()))
        .then(c => { if (c && c.turnstileSiteKey) renderTurnstile(c.turnstileSiteKey); return c ? solve(c.challenge, c.bits).then(nonce => ({challenge: c.challenge, nonce})) : null; })
        .catch(() => null);
    }
    return pow;
  }
  function renderTurnstile(key) {
    const box = gate.querySelector('.iw-ts'); if (box.dataset.done) return; box.dataset.done = '1';
    const draw = () => window.turnstile.render(box, {sitekey: key, theme: 'dark', language: de ? 'de' : 'en', callback: t => { tsToken = t; }, 'expired-callback': () => { tsToken = ''; }});
    if (window.turnstile) return draw();
    const sc = document.createElement('script'); sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; sc.async = true; sc.onload = draw; document.head.appendChild(sc);
  }
  function setBook() {
    const a = book.querySelector('a');
    if (bookingUrl) a.href = bookingUrl;   // used exactly as copied from Microsoft Bookings
    else a.href = `mailto:irena@aiden.ae?subject=${encodeURIComponent(de ? 'Kennenlerngespräch (30 Min.)' : 'Intro call (30 min)')}&body=${encodeURIComponent((lead ? lead.name + ', ' + lead.email + '\n\n' : '') + (de ? 'Ich würde gern einen Termin vereinbaren.' : 'I would like to schedule a call.'))}`;
  }
  const add = (t, c) => { const d = document.createElement('div'); d.className = 'iw-m ' + c; d.textContent = t; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; };
  function openChat() { gate.style.display = 'none'; chat.style.display = 'flex'; if (!log.children.length) add(T.hiName(lead.name.split(' ')[0]), 'iw-bot'); setBook(); }
  if (lead) openChat();
  gate.onsubmit = async e => {
    e.preventDefault(); const f = new FormData(gate), err = gate.querySelector('.iw-err');
    const body = { name: (f.get('name') || '').trim(), email: (f.get('email') || '').trim(), consent: !!f.get('consent'), website: f.get('website') || '', lang: de ? 'de' : 'en' };
    if (body.name.length < 2) return err.textContent = T.err.name;
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(body.email)) return err.textContent = T.err.email;
    if (!body.consent) return err.textContent = T.err.consent;
    const go = gate.querySelector('.iw-go'); go.disabled = true; err.textContent = T.check;
    let j = null;
    try {
      const p = await startPow(); if (!p || !p.nonce) throw new Error('pow');
      Object.assign(body, p, {turnstile: tsToken});
      const r = await fetch('/api/lead', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
      j = await r.json();
    } catch { j = {ok: false, reason: 'bot'}; }
    if (!j.ok || !j.chatToken) {
      go.disabled = false; pow = null; if (window.turnstile) try { window.turnstile.reset(); tsToken = ''; } catch {}
      if (j.reason === 'bot') startPow();                      // fresh challenge for the next try
      return err.textContent = T.err[j.reason] || T.err.bot;
    }
    err.textContent = '';
    lead = { name: body.name, email: body.email, lang: body.lang, chatToken: j.chatToken }; store.set('iw-lead', lead); openChat(); setTimeout(() => input.focus(), 50);
  };
  function resetGate() {
    lead = null; try { sessionStorage.removeItem('iw-lead'); } catch {}
    chat.style.display = 'none'; gate.style.display = 'flex'; gate.querySelector('.iw-go').disabled = false; pow = null; startPow();
  }
  function sendTranscript() {
    if (!lead || history.length <= sentCount) return; sentCount = history.length;
    const payload = JSON.stringify({ kind: 'transcript', chatToken: lead.chatToken, transcript: history });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/lead', new Blob([payload], {type: 'application/json'}));
    else fetch('/api/lead', {method: 'POST', headers: {'content-type': 'application/json'}, body: payload, keepalive: true});
  }
  addEventListener('pagehide', sendTranscript);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sendTranscript(); });
  async function ask(text) {
    if (!text.trim()) return; add(text, 'iw-me'); input.value = ''; panel.querySelector('.iw-chips').style.display = 'none';
    const t = add('', 'iw-bot'); t.innerHTML = '<span class="iw-dots"><i></i><i></i><i></i></span>';
    try { const r = await fetch('/api/chat', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({message: text, history, chatToken: lead && lead.chatToken})});
      const j = await r.json();
      if (r.status === 401) { t.remove(); return resetGate(); }
      t.textContent = j.answer; history.push({role: 'user', content: text}, {role: 'assistant', content: j.answer}); }
    catch { t.textContent = T.off; }
    if (history.length >= 2) book.style.display = 'block';
    log.scrollTop = log.scrollHeight;
  }
  const toggle = o => { panel.classList.toggle('open', o); if (o) startPow(); if (o) setTimeout(() => (lead ? input : gate.querySelector('input')).focus(), 50); else sendTranscript(); };
  btn.onclick = () => toggle(!panel.classList.contains('open'));
  panel.querySelector('.iw-x').onclick = () => toggle(false);
  panel.querySelector('.iw-form').onsubmit = e => { e.preventDefault(); ask(input.value); };
  panel.querySelectorAll('.iw-chips button').forEach(b => b.onclick = () => ask(b.textContent));
  document.querySelectorAll('a[href="#ask"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); toggle(true); }));
  addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
  window.openIrenaChat = () => toggle(true);
})();
