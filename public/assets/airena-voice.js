// "Mit AIrena sprechen": lädt den Sprach- und Avatar-Assistenten aus dem AIDEN-Portal erst beim ersten Klick.
// Der eigene schwebende Knopf des Portal-Widgets bleibt verborgen und das Fenster sitzt über dem Text-Chat-Knopf unten rechts.
(() => {
  const SRC = 'https://portal.irena-schindler.com/widget/v1.js';
  const ID = 'aiden-lena-kopie-2-kopie-2';
  const lang = (document.documentElement.lang || 'de').slice(0, 2) === 'de' ? 'de' : 'en';
  let geladen = false;
  const host = () => document.getElementById('aiden-widget');
  const verstecken = (sr) => {
    if (sr.getElementById('airena-site')) return;
    const st = document.createElement('style'); st.id = 'airena-site';
    st.textContent = '.launch,.teaser{display:none!important}.panel{bottom:calc(100px + env(safe-area-inset-bottom,0px))!important;max-height:calc(100vh - 130px)!important}';
    sr.appendChild(st);
  };
  const oeffnen = (versuche = 0) => {
    const h = host(), sr = h && h.shadowRoot, btn = sr && sr.querySelector('.launch');
    if (!btn) { if (versuche < 50) setTimeout(() => oeffnen(versuche + 1), 200); return; }
    verstecken(sr);
    const panel = sr.querySelector('.panel');
    if (!panel || getComputedStyle(panel).display === 'none') btn.click();
  };
  const start = (e) => {
    if (e) e.preventDefault();
    if (window.closeIrenaChat) window.closeIrenaChat();
    if (!geladen) {
      geladen = true;
      const s = document.createElement('script');
      s.src = SRC; s.defer = true;
      s.setAttribute('data-assistent', ID);
      s.setAttribute('data-lang', lang);
      document.body.appendChild(s);
    }
    oeffnen();
  };
  document.querySelectorAll('[data-voice]').forEach((el) => el.addEventListener('click', start));
})();
