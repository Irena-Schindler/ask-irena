// Booking page: pick a free 30-minute slot in Irena's calendar.
// Arrives from the chat with a signed chat token (#t=… or sessionStorage); otherwise asks for name and e-mail first.
(() => {
  const de = document.documentElement.lang === 'de';
  const T = de ? {
    loading: 'Freie Termine werden geladen …', none: 'Gerade sind keine Termine frei. Schreiben Sie mir gern an <a href="mailto:irena@aiden.ae">irena@aiden.ae</a>.',
    h: 'Termin wählen', sub: 'Kennenlerngespräch · 30 Minuten · Microsoft Teams · kostenlos', times: d => `Freie Zeiten am ${d}`,
    book: d => `${d} verbindlich buchen`, tz: z => `Alle Zeiten in Ihrer Zeitzone: ${z}`, as: (n, e) => `Sie buchen als <b>${n}</b> (${e}) · <a data-x>nicht Sie?</a>`,
    whoH: 'Kurz vorab', whoSub: 'Damit ich Ihnen die Bestätigung mit Teams-Link schicken kann.', name: 'Name', email: 'E-Mail',
    consent: 'Ich bin einverstanden, dass Name und E-Mail zur Terminvereinbarung verarbeitet werden (<a href="/datenschutz.html" target="_blank">Datenschutz</a>).',
    next: 'Weiter zu den Terminen', check: 'Sicherheitsprüfung läuft …',
    err: {name: 'Bitte Ihren Namen eingeben.', email: 'Bitte eine gültige E-Mail eingeben.', consent: 'Bitte der Datenverarbeitung zustimmen.', rate: 'Zu viele Versuche, bitte später erneut.', bot: 'Sicherheitsprüfung fehlgeschlagen. Bitte Seite neu laden.',
      taken: 'Dieser Termin wurde gerade vergeben. Bitte wählen Sie einen anderen.', fail: 'Das hat leider nicht geklappt. Bitte erneut versuchen oder an irena@aiden.ae schreiben.'},
    doneH: 'Ihr Termin steht!', done: (d, e) => `Wir sprechen uns am <b>${d}</b>. Die Bestätigung mit Teams-Link und Kalenderdatei ist unterwegs an <b>${e}</b>.`,
    doneP: 'Ich freue mich sehr darauf, Sie kennenzulernen!', back: 'Zurück zur Startseite', home: '/de/', locale: 'de-DE', wd: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], uhr: ' Uhr',
  } : {
    loading: 'Loading free slots…', none: 'No free slots right now. Feel free to write to <a href="mailto:irena@aiden.ae">irena@aiden.ae</a>.',
    h: 'Pick a time', sub: 'Intro call · 30 minutes · Microsoft Teams · free', times: d => `Free times on ${d}`,
    book: d => `Book ${d}`, tz: z => `All times in your time zone: ${z}`, as: (n, e) => `Booking as <b>${n}</b> (${e}) · <a data-x>not you?</a>`,
    whoH: 'Quick intro', whoSub: 'So I can send you the confirmation with the Teams link.', name: 'Name', email: 'E-mail',
    consent: 'I agree that my name and e-mail are processed to schedule the call (<a href="/datenschutz.html" target="_blank">privacy</a>).',
    next: 'Continue to available times', check: 'Running security check…',
    err: {name: 'Please enter your name.', email: 'Please enter a valid e-mail.', consent: 'Please accept the data processing.', rate: 'Too many attempts, please try again later.', bot: 'Security check failed. Please reload the page.',
      taken: 'That slot was just taken. Please choose another one.', fail: 'Sorry, that did not work. Please try again or write to irena@aiden.ae.'},
    doneH: "You're booked!", done: (d, e) => `We'll talk on <b>${d}</b>. The confirmation with the Teams link and calendar file is on its way to <b>${e}</b>.`,
    doneP: "I'm really looking forward to meeting you!", back: 'Back to the homepage', home: '/', locale: 'en-GB', wd: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], uhr: '',
  };
  const card = document.getElementById('card');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin'; } catch { return 'Europe/Berlin'; } })();
  const fmt = (iso, o) => new Date(iso).toLocaleString(T.locale, o);
  const full = iso => fmt(iso, {weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'}) + T.uhr;
  const dayKey = d => d.toLocaleDateString('en-CA');            // YYYY-MM-DD in local time
  const store = { get: () => { try { return JSON.parse(sessionStorage.getItem('iw-lead')); } catch { return null; } },
    set: v => { try { sessionStorage.setItem('iw-lead', JSON.stringify(v)); } catch {} }, del: () => { try { sessionStorage.removeItem('iw-lead'); } catch {} } };

  // Session from the chat: #t=<token> (link from the widget) or the same tab's sessionStorage.
  let lead = null;
  const m = location.hash.match(/[#&]t=([\w.-]+)/);
  if (m) {
    try { const p = JSON.parse(atob(m[1].split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))); lead = {...p.lead, chatToken: m[1]}; store.set(lead); } catch {}
    history.replaceState(null, '', location.pathname);
  }
  if (!lead) { const s = store.get(); if (s && s.chatToken) lead = s; }

  const api = body => fetch('/api/booking', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({...body, chatToken: lead.chatToken})})
    .then(async r => ({status: r.status, ...(await r.json().catch(() => ({})))}));

  // ---------- step 1: who are you (only without a chat session) ----------
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
  const getPow = () => fetch('/api/settings', {cache: 'no-store'}).then(r => r.json()).then(c => solve(c.challenge, c.bits).then(nonce => ({challenge: c.challenge, nonce, at: Date.now()})));
  function who() {
    card.innerHTML = `<h2>${T.whoH}</h2><p class="sub">${T.whoSub}</p>
      <form class="who" novalidate><input type="text" name="name" autocomplete="name" placeholder="${T.name}" maxlength="80" aria-label="${T.name}">
      <input type="email" name="email" autocomplete="email" placeholder="${T.email}" maxlength="120" aria-label="${T.email}">
      <div class="hp" aria-hidden="true"><input type="text" name="iw_x7_note" tabindex="-1" autocomplete="off" data-lpignore="true" data-1p-ignore></div>
      <label><input type="checkbox" name="consent"> <span>${T.consent}</span></label>
      <button class="go">${T.next}</button><div class="err" aria-live="polite"></div></form>`;
    let pow = getPow().catch(() => null);
    const f = card.querySelector('form'), err = card.querySelector('.err');
    f.onsubmit = async e => {
      e.preventDefault(); const d = new FormData(f);
      const body = {name: (d.get('name') || '').trim(), email: (d.get('email') || '').trim(), consent: !!d.get('consent'), hp: d.get('iw_x7_note') || '', lang: de ? 'de' : 'en'};
      if (body.name.length < 2) return err.textContent = T.err.name;
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(body.email)) return err.textContent = T.err.email;
      if (!body.consent) return err.textContent = T.err.consent;
      const go = f.querySelector('.go'); go.disabled = true; err.textContent = T.check;
      const attempt = async () => {
        const p = await pow; if (!p || !p.nonce) throw new Error('pow');
        const age = Date.now() - p.at; if (age < 2300) await new Promise(r => setTimeout(r, 2300 - age));
        const r = await fetch('/api/lead', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({...body, challenge: p.challenge, nonce: p.nonce})});
        return r.json();
      };
      let j; try { j = await attempt(); } catch { j = {ok: false, reason: 'bot'}; }
      if (!j.ok && j.reason === 'bot') { pow = getPow().catch(() => null); try { j = await attempt(); } catch { j = {ok: false, reason: 'bot'}; } }
      if (!j.ok || !j.chatToken) { go.disabled = false; pow = getPow().catch(() => null); return err.textContent = T.err[j.reason] || T.err.bot; }
      lead = {name: body.name, email: body.email, lang: body.lang, chatToken: j.chatToken}; store.set(lead); pick();
    };
  }

  // ---------- step 2: calendar ----------
  async function pick(note = '') {
    card.innerHTML = `<div class="loading">${T.loading}</div>`;
    const j = await api({action: 'slots'}).catch(() => ({status: 0}));
    if (j.status === 401) { store.del(); lead = null; return who(); }
    if (!j.ok) { card.innerHTML = `<p class="err">${T.err.fail}</p>`; return; }
    if (!j.slots.length) { card.innerHTML = `<h2>${T.h}</h2><p>${T.none}</p>`; return; }
    const byDay = {}; j.slots.forEach(s => (byDay[dayKey(new Date(s))] = byDay[dayKey(new Date(s))] || []).push(s));
    const keys = Object.keys(byDay).sort();
    let day = keys[0], slot = '';
    // calendar from Monday of this week until the week of the last free day
    const start = new Date(); start.setHours(12, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const last = new Date(keys[keys.length - 1] + 'T12:00:00');
    const draw = () => {
      const mon = d => d.toLocaleDateString(T.locale, {month: 'long'}), yr = last.getFullYear();
      const title = start.getMonth() === last.getMonth() ? `${mon(start)} ${yr}` : `${mon(start)} – ${mon(last)} ${yr}`;
      let cells = `<div class="mon">${title}</div>` + T.wd.map(w => `<div class="wd">${w}</div>`).join('');
      for (const d = new Date(start); d <= last || d.getDay() !== 1; d.setDate(d.getDate() + 1)) {
        const k = dayKey(d), n = (byDay[k] || []).length;
        const num = d.getDate() === 1 ? `${d.getDate()}.<small>${d.toLocaleDateString(T.locale, {month: 'short'})}</small>` : `${d.getDate()}`;
        cells += n ? `<button class="has ${k === day ? 'on' : ''}" data-d="${k}" aria-label="${d.toLocaleDateString(T.locale, {weekday: 'long', day: 'numeric', month: 'long'})}">${num}<small>${n}×</small></button>`
          : `<button disabled aria-hidden="true">${num}</button>`;
      }
      const label = fmt(byDay[day][0], {weekday: 'long', day: 'numeric', month: 'long'});
      card.innerHTML = `<h2>${T.h}</h2><p class="sub">${T.sub}</p><p class="who-is">${T.as(esc(lead.name), esc(lead.email))}</p>
        ${note ? `<p class="err">${note}</p>` : ''}<div class="cal">${cells}</div>
        <div class="times"><h3>${T.times(label)}</h3><div class="grid">${byDay[day].map(s => `<button data-s="${s}" class="${s === slot ? 'on' : ''}">${fmt(s, {hour: '2-digit', minute: '2-digit'})}</button>`).join('')}</div></div>
        ${slot ? `<button class="go">${T.book(full(slot))}</button>` : ''}<div class="err" aria-live="polite"></div><p class="tz">${T.tz(tz.replace(/_/g, ' '))}</p>`;
      card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { day = b.dataset.d; slot = ''; note = ''; draw(); });
      card.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { slot = b.dataset.s; draw(); card.querySelector('.go').scrollIntoView({block: 'nearest', behavior: 'smooth'}); });
      const x = card.querySelector('[data-x]'); if (x) x.onclick = () => { store.del(); lead = null; who(); };
      const go = card.querySelector('.go'); if (go) go.onclick = () => book(slot, go);
    };
    draw();
  }

  async function book(start, go) {
    go.disabled = true; go.textContent = '…';
    const j = await api({action: 'book', start, tz}).catch(() => ({status: 0}));
    if (j.status === 401) { store.del(); lead = null; return who(); }
    if (j.status === 409) return pick(T.err.taken);
    if (!j.ok) { go.disabled = false; go.textContent = T.book(full(start)); card.querySelector('.err').textContent = T.err.fail; return; }
    card.innerHTML = `<div class="done"><div class="ok">✓</div><h2>${T.doneH}</h2><p>${T.done(full(j.start), esc(lead.email))}</p><p>${T.doneP}</p>
      <p><a href="${T.home}">${T.back}</a></p></div>`;
  }

  lead ? pick() : who();
})();
