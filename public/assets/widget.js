// Floating "Ask my AI" chat widget. Uses the same /api/chat endpoint as the page section.
(() => {
  const de = document.documentElement.lang === 'de';
  const T = de ? {title: 'Irenas KI-Assistent', sub: 'Online · antwortet aus geprüften Fakten', hi: 'Hallo! Fragen Sie mich nach Irenas Erfahrung, Projekten oder Verfügbarkeit.', ph: 'Ihre Frage …', send: 'Senden', open: 'Frag meine KI',
      chips: ['Ist sie verfügbar?', 'Welche Voice-AI-Erfahrung hat sie?', 'Was hat sie bei VW gemacht?'], off: 'Der Assistent ist gerade nicht erreichbar. Bitte schreiben Sie an irena@aiden.ae.'}
    : {title: "Irena's AI assistant", sub: 'Online · answers from verified facts', hi: "Hi! Ask me about Irena's experience, projects or availability – in English or German.", ph: 'Type your question…', send: 'Send', open: 'Ask my AI',
      chips: ['Is she available?', 'What voice AI work has she done?', 'What did she do at Volkswagen?'], off: 'The assistant is offline right now. Please write to irena@aiden.ae.'};
  const css = `
  .iw-btn{position:fixed;right:22px;bottom:22px;z-index:9999;display:flex;align-items:center;gap:10px;padding:10px 18px 10px 10px;border-radius:999px;border:1px solid rgba(242,201,76,.6);
    background:#0c0c0f;color:#f4f1e8;font:600 15px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;cursor:pointer;box-shadow:0 10px 40px rgba(212,169,10,.35);animation:iwPulse 2.8s infinite}
  .iw-btn:hover{transform:translateY(-2px)}
  .iw-orb{width:38px;height:38px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f2c94c,#d4a90a 50%,#5a4700);box-shadow:0 0 18px rgba(212,169,10,.7)}
  @keyframes iwPulse{0%{box-shadow:0 0 0 0 rgba(212,169,10,.45),0 10px 40px rgba(212,169,10,.35)}70%{box-shadow:0 0 0 14px rgba(212,169,10,0),0 10px 40px rgba(212,169,10,.35)}100%{box-shadow:0 0 0 0 rgba(212,169,10,0),0 10px 40px rgba(212,169,10,.35)}}
  .iw-panel{position:fixed;right:22px;bottom:90px;z-index:9999;width:min(380px,calc(100vw - 32px));height:min(560px,calc(100vh - 120px));display:none;flex-direction:column;
    background:#0c0c0f;color:#f4f1e8;border:1px solid rgba(212,169,10,.5);border-radius:22px;overflow:hidden;box-shadow:0 0 0 6px rgba(212,169,10,.06),0 30px 90px rgba(0,0,0,.5);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
  .iw-panel.open{display:flex;animation:iwIn .25s ease-out}@keyframes iwIn{from{opacity:0;transform:translateY(12px)}}
  .iw-head{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.09)}
  .iw-head .iw-orb{width:34px;height:34px}.iw-head b{display:block;font-size:15px}.iw-head span{font-size:12px;color:#a9a59a}
  .iw-head span:before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:#4ade80;margin-right:6px;box-shadow:0 0 8px #4ade80}
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
  @media (max-width:520px){.iw-btn span{display:none}.iw-btn{padding:8px}.iw-panel{right:16px;bottom:80px}}
  @media (prefers-reduced-motion:reduce){.iw-btn,.iw-panel.open,.iw-dots i{animation:none}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const btn = document.createElement('button'); btn.className = 'iw-btn'; btn.setAttribute('aria-label', T.open);
  btn.innerHTML = `<div class="iw-orb"></div><span>${T.open}</span>`;
  const panel = document.createElement('div'); panel.className = 'iw-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', T.title);
  panel.innerHTML = `<div class="iw-head"><div class="iw-orb"></div><div><b>${T.title}</b><span>${T.sub}</span></div><button class="iw-x" aria-label="close">×</button></div>
    <div class="iw-log"><div class="iw-m iw-bot">${T.hi}</div></div>
    <div class="iw-chips">${T.chips.map(c => `<button>${c}</button>`).join('')}</div>
    <form class="iw-form"><input maxlength="500" placeholder="${T.ph}" aria-label="${T.ph}"><button>${T.send}</button></form>`;
  document.body.append(btn, panel);
  const log = panel.querySelector('.iw-log'), input = panel.querySelector('input'), history = [];
  const add = (t, c) => { const d = document.createElement('div'); d.className = 'iw-m ' + c; d.textContent = t; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; };
  async function ask(text) {
    if (!text.trim()) return; add(text, 'iw-me'); input.value = ''; panel.querySelector('.iw-chips').style.display = 'none';
    const t = add('', 'iw-bot'); t.innerHTML = '<span class="iw-dots"><i></i><i></i><i></i></span>';
    try { const r = await fetch('/api/chat', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({message: text, history})});
      const j = await r.json(); t.textContent = j.answer; history.push({role: 'user', content: text}, {role: 'assistant', content: j.answer}); }
    catch { t.textContent = T.off; }
    log.scrollTop = log.scrollHeight;
  }
  const toggle = o => { panel.classList.toggle('open', o); if (o) setTimeout(() => input.focus(), 50); };
  btn.onclick = () => toggle(!panel.classList.contains('open'));
  panel.querySelector('.iw-x').onclick = () => toggle(false);
  panel.querySelector('form').onsubmit = e => { e.preventDefault(); ask(input.value); };
  panel.querySelectorAll('.iw-chips button').forEach(b => b.onclick = () => ask(b.textContent));
  document.querySelectorAll('a[href="#ask"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); toggle(true); }));
  addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
  window.openIrenaChat = () => toggle(true);
})();
