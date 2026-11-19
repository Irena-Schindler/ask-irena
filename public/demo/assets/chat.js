/* Demo chat widget: answers via /api/demo-chat (server-side model), curated FAQ answers as fallback. */
(function () {
  var C = window.BOT;
  var root = document.getElementById('cb');
  var ICON_SEND = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var ICON_CHAT = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>';
  var ICON_MIN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>';
  var ICON_RESET = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';

  root.innerHTML =
    '<section class="cb-panel" id="cb-panel" aria-label="' + C.name + ' Chat">' +
      '<header class="cb-head"><img class="cb-ava" src="' + C.avatar + '" alt=""><div class="cb-title"><b>' + C.name + '</b>' +
      '<div class="cb-status"><i class="cb-dot"></i><span>' + C.t.online + '</span></div></div>' +
      '<button class="cb-iconbtn" id="cb-reset" title="' + C.t.reset + '" aria-label="' + C.t.reset + '">' + ICON_RESET + '</button>' +
      '<button class="cb-iconbtn" id="cb-min" title="' + C.t.minimize + '" aria-label="' + C.t.minimize + '">' + ICON_MIN + '</button></header>' +
      '<div class="cb-log" id="cb-log" aria-live="polite"></div>' +
      '<div class="cb-chips" id="cb-chips"></div>' +
      '<form class="cb-form" id="cb-form"><input id="cb-input" autocomplete="off" placeholder="' + C.t.placeholder + '" aria-label="' + C.t.placeholder + '">' +
      '<button class="cb-send" id="cb-send" aria-label="' + C.t.send + '">' + ICON_SEND + '</button></form>' +
      '<div class="cb-foot">' + C.t.foot + '</div>' +
    '</section>' +
    '<div class="cb-launchrow" id="cb-launchrow" hidden>' +
      '<div class="cb-teaser" id="cb-teaser"><button type="button" class="cb-teaser-text" id="cb-teaser-open">' + C.t.teaser + '</button>' +
      '<button type="button" class="cb-teaser-x" id="cb-teaser-x" aria-label="' + C.t.hideTeaser + '">×</button></div>' +
      '<button class="cb-launch" id="cb-launch" aria-label="' + C.t.open + '">' + ICON_CHAT + '</button>' +
    '</div>';

  var $ = function (id) { return document.getElementById(id); };
  var log = $('cb-log'), input = $('cb-input'), sendBtn = $('cb-send'), chipsEl = $('cb-chips');
  var history = [], busy = false;

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function inline(s) {
    return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function md(text) {
    var out = [], list = null;
    esc(text.trim()).split(/\n/).forEach(function (line) {
      var m = line.match(/^\s*[-•*]\s+(.*)/);
      if (m) { if (!list) { list = []; } list.push('<li>' + inline(m[1]) + '</li>'); return; }
      if (list) { out.push('<ul>' + list.join('') + '</ul>'); list = null; }
      if (line.trim()) out.push('<p>' + inline(line) + '</p>');
    });
    if (list) out.push('<ul>' + list.join('') + '</ul>');
    return out.join('');
  }
  function parseTags(text) {
    var tags = [];
    var clean = text.replace(/\[\[(\w+)(?::([\w-]+))?\]\]/g, function (_, k, v) { tags.push({ k: k, v: v }); return ''; });
    clean = clean.replace(/\[\[[^\]]*$/, '');
    return { text: clean, tags: tags };
  }
  function scroll() { log.scrollTop = log.scrollHeight; }

  function row(role) {
    var r = document.createElement('div'); r.className = 'cb-row ' + role;
    if (role === 'bot') { var a = document.createElement('img'); a.className = 'cb-ava'; a.src = C.avatar; a.alt = ''; r.appendChild(a); }
    var col = document.createElement('div'); col.className = 'cb-col';
    var b = document.createElement('div'); b.className = 'cb-bubble'; col.appendChild(b); r.appendChild(col);
    log.appendChild(r); scroll();
    return { row: r, col: col, bubble: b };
  }
  function renderBot(el, raw, final) {
    var p = parseTags(raw);
    el.bubble.innerHTML = md(p.text) || '<span class="cb-typing"><span></span><span></span><span></span></span>';
    if (!final) return;
    var products = [], seen = {};
    p.tags.forEach(function (t) {
      if (t.k === 'product' && C.products && C.products[t.v] && !seen[t.v]) { seen[t.v] = 1; products.push(C.products[t.v]); }
    });
    if (products.length) {
      var wrap = document.createElement('div'); wrap.className = 'cb-cards';
      products.slice(0, 4).forEach(function (pr) {
        var a = document.createElement('a'); a.className = 'cb-card'; a.href = pr.url; a.target = '_blank'; a.rel = 'noopener';
        a.innerHTML = (pr.img ? '<img src="' + pr.img + '" alt="">' : '') + '<b>' + esc(pr.name) + '</b><span>' + esc(pr.price) + '</span>';
        wrap.appendChild(a);
      });
      el.col.appendChild(wrap);
    }
    if (p.tags.some(function (t) { return t.k === 'cta'; }) && C.cta) {
      var c = document.createElement('a'); c.className = 'cb-cta'; c.href = C.cta.url; c.target = '_blank'; c.rel = 'noopener'; c.textContent = C.cta.label;
      el.col.appendChild(c);
    }
    scroll();
  }
  function userMsg(text) { var el = row('user'); el.bubble.textContent = text; }

  function setChips(list) {
    chipsEl.innerHTML = '';
    (list || []).forEach(function (q) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'cb-chip'; b.textContent = q;
      b.onclick = function () { send(q); };
      chipsEl.appendChild(b);
    });
  }

  function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function localAnswer(q) {
    var n = norm(q), best = null, bestScore = 0;
    C.faq.forEach(function (f) {
      var s = 0; f.k.forEach(function (k) { if (n.indexOf(norm(k)) !== -1) s += k.length > 4 ? 2 : 1; });
      if (s > bestScore) { bestScore = s; best = f; }
    });
    return best ? best.a : C.fallback;
  }

  function ask(q, prior) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 16000);
    return fetch(C.api || '/api/demo-chat', {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctrl ? ctrl.signal : undefined,
      body: JSON.stringify({ bot: C.bot, message: q, history: prior })
    }).then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(timer); return j; }, function () { clearTimeout(timer); return {}; });
  }

  function send(q) {
    q = (q || '').trim();
    if (!q || busy) return;
    busy = true; sendBtn.disabled = true; setChips([]);
    userMsg(q);
    var prior = history.slice(1).slice(-8);
    history.push({ role: 'user', content: q });
    var el = row('bot'); renderBot(el, '', false);
    var done = function (text) {
      history.push({ role: 'assistant', content: text });
      renderBot(el, text, true);
      busy = false; sendBtn.disabled = false; input.focus();
    };
    ask(q, prior).then(function (j) {
      // AI answer when the server has one; otherwise the curated FAQ answers of this page.
      if (j && j.answer && (j.mode === 'llm' || j.mode === 'guard' || j.mode === 'busy')) done(j.answer);
      else done(localAnswer(q));
    });
  }

  function start() {
    log.innerHTML = ''; history = [];
    var el = row('bot'); renderBot(el, C.greeting, true);
    history.push({ role: 'assistant', content: C.greeting });
    setChips(C.chips);
  }

  $('cb-form').addEventListener('submit', function (e) { e.preventDefault(); var v = input.value; input.value = ''; send(v); });
  $('cb-reset').onclick = start;
  function minimize() { $('cb-panel').hidden = true; $('cb-launchrow').hidden = false; }
  function openChat() { $('cb-panel').hidden = false; $('cb-launchrow').hidden = true; input.focus(); }
  $('cb-min').onclick = function () { minimize(); $('cb-launch').focus(); };
  $('cb-launch').onclick = openChat;
  $('cb-teaser-open').onclick = openChat;
  $('cb-teaser-x').onclick = function () { $('cb-teaser').hidden = true; $('cb-launch').focus(); };
  document.querySelectorAll('[data-open-chat]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); openChat(); if (b.dataset.q) send(b.dataset.q); });
  });

  start();
  // On phones the open panel would cover the page: start with the button and its greeting bubble.
  if (window.matchMedia && window.matchMedia('(max-width: 600px)').matches) minimize();
})();
