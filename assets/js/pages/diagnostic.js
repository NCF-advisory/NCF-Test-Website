/* ═══════════════════════════════════════════════════════════
   Page /diagnostic-valeur/ — diagnostic création de valeur.
   Page éphémère (campagne LinkedIn), non indexée.

   10 questions, une à la fois. Barème : Oui = 2, Partiellement = 1,
   Non = 0 → score sur 20, trois paliers :
     17–20  Leviers activés (création de valeur en cours d'optimisation)
     11–16  Leviers partiellement activés (valeur à optimiser)
      0–10  Leviers inactifs (perte de valeur potentielle)

   Tout se passe dans le navigateur : aucune réponse n'est
   transmise ni enregistrée.
   ═══════════════════════════════════════════════════════════ */
(() => {
  const card = document.getElementById('diag-card');
  if (!card) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Délai entre le choix d'une réponse et la question suivante :
  // assez long pour relire sa réponse (et éventuellement la corriger).
  const AUTO_ADVANCE_MS = 500;

  const ARROW = '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  const BACK = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';
  const CHECK = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
  const DOT = '<svg aria-hidden="true" width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="currentColor"/></svg>';

  // Libellés par défaut : Oui = 2, Partiellement = 1, Non = 0.
  const QUESTIONS = [
    { theme: 'Dépendance au dirigeant',
      q: 'Votre entreprise peut-elle fonctionner sans vous si vous vous absentez 1 semaine par mois ?' },
    { theme: 'Gouvernance',
      q: 'Les décisions stratégiques sont-elles partagées (ou centralisées autour de vous) ?',
      opts: ['Oui (partagées)', 'Partiellement', 'Non (centralisées)'] },
    { theme: 'Savoir-faire',
      q: 'Le savoir-faire est-il partagé ?' },
    { theme: 'Processus',
      q: 'Vos processus clés (commercial, production, gestion, RH) sont-ils formalisés ?' },
    { theme: 'Stratégie',
      q: "La stratégie de l'entreprise est-elle formalisée et connue de tous ?" },
    { theme: 'Clients',
      q: "La société présente-t-elle une diversification clients telle qu'aucun client ne dépasse 20 % de l'activité ?" },
    { theme: 'Fournisseurs',
      q: 'Disposez-vous de solutions alternatives pour vos fournisseurs stratégiques ?' },
    { theme: 'Croissance externe',
      q: 'Avez-vous déjà envisagé une croissance externe ?' },
    { theme: 'Innovation',
      q: "Accordez-vous du temps à l'innovation produits / services ?" },
    { theme: 'Pilotage financier',
      q: 'Pilotez-vous votre entreprise par les cash-flows ?' },
  ];
  const DEFAULT_OPTS = ['Oui', 'Partiellement', 'Non'];
  const MAX_SCORE = QUESTIONS.length * 2;

  // Paliers (bornes basses) et contenus de résultat — texte du brief.
  const TIERS = [
    {
      min: 17, cls: 'is-t1',
      badge: 'Leviers activés',
      title: "Création de valeur en cours d'optimisation",
      cta: 'Je prends rendez-vous',
      html: `
        <p class="diag-r-lead">Votre entreprise dispose déjà de solides fondamentaux de création de valeur.</p>
        <div class="diag-r-block">
          <h3 class="diag-r-block-h">Le constat</h3>
          <ul class="diag-r-list is-check">
            <li>${CHECK}<span>organisation structurée, moins dépendante du dirigeant</span></li>
            <li>${CHECK}<span>processus clés relativement formalisés</span></li>
            <li>${CHECK}<span>diversification qui limite les risques opérationnels</span></li>
            <li>${CHECK}<span>réflexion de développement et de pérennisation engagée</span></li>
          </ul>
        </div>
        <div class="diag-r-grid">
          <div class="diag-r-block">
            <h3 class="diag-r-block-h">Une base favorable pour</h3>
            <ul class="diag-r-list">
              <li>${DOT}<span>améliorer votre valorisation future</span></li>
              <li>${DOT}<span>renforcer l'attractivité de votre société</span></li>
              <li>${DOT}<span>sécuriser votre rentabilité dans le temps</span></li>
              <li>${DOT}<span>préparer sereinement une transmission ou une croissance externe</span></li>
            </ul>
          </div>
          <div class="diag-r-block">
            <h3 class="diag-r-block-h">Un regard extérieur peut encore identifier</h3>
            <ul class="diag-r-list">
              <li>${DOT}<span>des leviers de valorisation complémentaires</span></li>
              <li>${DOT}<span>des axes d'amélioration du cash-flow</span></li>
              <li>${DOT}<span>des opportunités de structuration ou de croissance</span></li>
            </ul>
          </div>
        </div>
        <p class="diag-r-note">Même les entreprises les plus performantes disposent encore de <strong>marges d'optimisation</strong>.</p>`,
    },
    {
      min: 11, cls: 'is-t2',
      badge: 'Leviers partiellement activés',
      title: 'Valeur à optimiser',
      cta: 'Je demande un échange confidentiel',
      html: `
        <p class="diag-r-lead">Votre entreprise présente un potentiel de création de valeur, mais plusieurs leviers restent à structurer.</p>
        <p>Certaines bonnes pratiques sont déjà en place.</p>
        <div class="diag-r-grid">
          <div class="diag-r-block">
            <h3 class="diag-r-block-h">Ce qui peut limiter votre valorisation</h3>
            <ul class="diag-r-list">
              <li>${DOT}<span>dépendance encore forte au dirigeant</span></li>
              <li>${DOT}<span>organisation insuffisamment formalisée</span></li>
              <li>${DOT}<span>concentration clients ou fournisseurs</span></li>
              <li>${DOT}<span>manque de visibilité sur les cash-flows</span></li>
              <li>${DOT}<span>innovation ou développement stratégique peu structurés</span></li>
            </ul>
          </div>
          <div class="diag-r-block">
            <h3 class="diag-r-block-h">Sans empêcher la croissance, cela peut</h3>
            <ul class="diag-r-list">
              <li>${DOT}<span>réduire la résilience de l'entreprise</span></li>
              <li>${DOT}<span>limiter son attractivité auprès d'un investisseur ou repreneur</span></li>
              <li>${DOT}<span>entraîner une décote lors d'une cession</span></li>
            </ul>
          </div>
        </div>
        <p class="diag-r-note">Une <strong>structuration progressive</strong> permet généralement d'améliorer significativement la valeur de l'entreprise à moyen terme. Un échange confidentiel permettrait d'identifier les <strong>leviers prioritaires</strong> à activer.</p>`,
    },
    {
      min: 0, cls: 'is-t3',
      badge: 'Leviers inactifs',
      title: 'Perte de valeur potentielle',
      cta: 'Je prends rendez-vous',
      html: `
        <p class="diag-r-lead">Plusieurs leviers essentiels de création de valeur semblent aujourd'hui insuffisamment activés.</p>
        <p>Votre entreprise paraît encore fortement dépendante du dirigeant.</p>
        <div class="diag-r-grid">
          <div class="diag-r-block">
            <h3 class="diag-r-block-h">En l'état</h3>
            <ul class="diag-r-list">
              <li>${DOT}<span>les processus sont peu formalisés</span></li>
              <li>${DOT}<span>le savoir-faire reste concentré</span></li>
              <li>${DOT}<span>la visibilité financière est limitée</span></li>
              <li>${DOT}<span>certains risques clients ou fournisseurs peuvent fragiliser l'activité</span></li>
            </ul>
          </div>
          <div class="diag-r-block">
            <h3 class="diag-r-block-h">Cette situation peut impacter</h3>
            <ul class="diag-r-list">
              <li>${DOT}<span>la capacité de développement de l'entreprise</span></li>
              <li>${DOT}<span>sa rentabilité à long terme</span></li>
              <li>${DOT}<span>sa valorisation en cas d'ouverture du capital ou de cession</span></li>
            </ul>
          </div>
        </div>
        <p>Sans anticipation, ces facteurs peuvent entraîner une <strong>perte significative de valeur</strong>.</p>
        <p class="diag-r-note"><strong>La bonne nouvelle&nbsp;:</strong> ces leviers peuvent généralement être améliorés rapidement avec une stratégie adaptée. Un échange permettrait d'identifier les <strong>actions prioritaires</strong> pour sécuriser et augmenter durablement la valeur de votre entreprise.</p>`,
    },
  ];

  // Zones de la jauge, en points (bornes hautes incluses).
  const ZONES = [
    { to: 10, cls: 'z3' },
    { to: 16, cls: 'z2' },
    { to: 20, cls: 'z1' },
  ];

  const answers = new Array(QUESTIONS.length).fill(null);
  let timers = [];

  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  function setContent(html) {
    clearTimers();
    card.innerHTML = `<div class="diag-step${reducedMotion ? '' : ' diag-anim'}">${html}</div>`;
  }

  // Sur mobile, la carte peut être sous le pli après un changement d'étape.
  function keepInView() {
    const top = card.getBoundingClientRect().top;
    if (top < 60) card.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  // ── Écran d'accueil ──────────────────────────────────────────
  function renderIntro() {
    setContent(`
      <div class="diag-intro">
        <ul class="diag-chips" aria-label="Ce qu'il faut savoir">
          <li><svg aria-hidden="true"><use href="/assets/ncf-icons/icons-sprite.svg#steps"/></svg>10 questions</li>
          <li><svg aria-hidden="true"><use href="/assets/ncf-icons/icons-sprite.svg#clock"/></svg>2 minutes</li>
          <li><svg aria-hidden="true"><use href="/assets/ncf-icons/icons-sprite.svg#lock"/></svg>Confidentiel</li>
        </ul>
        <button type="button" class="diag-go" id="diag-go">
          Je fais le diagnostic
          ${ARROW}
        </button>
      </div>`);
    card.querySelector('#diag-go').addEventListener('click', () => renderQuestion(0));
  }

  // ── Questions ────────────────────────────────────────────────
  function renderQuestion(i) {
    const item = QUESTIONS[i];
    const opts = item.opts || DEFAULT_OPTS;
    // Barre pleine sur la dernière question (10/10 = 100 %).
    const pct = Math.round(((i + 1) / QUESTIONS.length) * 100);

    setContent(`
      <div class="diag-head">
        <span class="diag-theme">${item.theme}</span>
        <span class="diag-count">Question ${i + 1}<span class="diag-count-total"> / ${QUESTIONS.length}</span></span>
      </div>
      <div class="diag-bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
      <h2 class="diag-q">${item.q}</h2>
      <div class="diag-opts" role="group" aria-label="Votre réponse">
        ${opts.map((label, v) => `
          <button type="button" class="diag-opt${answers[i] === 2 - v ? ' is-selected' : ''}" data-points="${2 - v}">
            <span class="diag-opt-mark" aria-hidden="true">${CHECK}</span>
            <span class="diag-opt-label">${label}</span>
          </button>`).join('')}
      </div>
      <div class="diag-nav">
        ${i > 0 ? `<button type="button" class="diag-back" id="diag-back">${BACK} Question précédente</button>` : ''}
      </div>`);

    card.querySelectorAll('.diag-opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        answers[i] = Number(btn.dataset.points);
        card.querySelectorAll('.diag-opt').forEach((b) => b.classList.toggle('is-selected', b === btn));
        clearTimers();
        timers.push(setTimeout(() => {
          if (i + 1 < QUESTIONS.length) renderQuestion(i + 1);
          else renderComputing();
        }, reducedMotion ? 0 : AUTO_ADVANCE_MS));
      });
    });
    card.querySelector('#diag-back')?.addEventListener('click', () => renderQuestion(i - 1));
    keepInView();
  }

  // ── Suspense avant résultat ──────────────────────────────────
  function renderComputing() {
    if (reducedMotion) { renderResult(); return; }
    const STEPS = [
      'Analyse de vos réponses…',
      'Calcul de votre score de création de valeur…',
      'Identification des leviers à activer…',
    ];
    const STEP_MS = 620;
    setContent(`
      <div class="diag-compute" aria-busy="true">
        <div class="diag-spinner" aria-hidden="true"></div>
        <p class="diag-compute-msg">${STEPS[0]}</p>
      </div>`);
    const msg = card.querySelector('.diag-compute-msg');
    STEPS.slice(1).forEach((s, idx) => {
      timers.push(setTimeout(() => { msg.textContent = s; }, STEP_MS * (idx + 1)));
    });
    timers.push(setTimeout(renderResult, STEP_MS * STEPS.length));
    keepInView();
  }

  // ── Résultat ─────────────────────────────────────────────────
  function renderResult() {
    const score = answers.reduce((sum, v) => sum + (v || 0), 0);
    const tier = TIERS.find((t) => score >= t.min);
    lastResult = { score, tier };

    let from = 0;
    const zonesHtml = ZONES.map((z) => {
      const w = ((z.to - from) / MAX_SCORE) * 100;
      from = z.to;
      return `<span class="diag-zone ${z.cls}" style="width:${w}%"></span>`;
    }).join('');

    setContent(`
      <div class="diag-result ${tier.cls}">
        <p class="diag-r-eyebrow">Votre résultat</p>
        <div class="diag-score-row">
          <div class="diag-score"><span id="diag-score-n">0</span><span class="diag-score-max">/ ${MAX_SCORE}</span></div>
          <span class="diag-tier-badge"><span class="diag-tier-dot" aria-hidden="true"></span>${tier.badge}</span>
        </div>
        <div class="diag-gauge" aria-hidden="true">
          <div class="diag-gauge-track">${zonesHtml}<span class="diag-gauge-marker" id="diag-marker"></span></div>
          <div class="diag-gauge-caps"><span>0</span><span>10</span><span>16</span><span>${MAX_SCORE}</span></div>
        </div>
        <h2 class="diag-r-title">${tier.title}</h2>
        <div class="diag-r-body">${tier.html}</div>
        <button type="button" class="diag-cta" id="diag-cta">${tier.cta} ${ARROW}</button>
        <p class="diag-r-fine">Premier échange confidentiel et gratuit, sans engagement.</p>
        <button type="button" class="diag-restart" id="diag-restart">Refaire le diagnostic</button>
      </div>`);

    const nEl = card.querySelector('#diag-score-n');
    const marker = card.querySelector('#diag-marker');
    const target = Math.max(2, (score / MAX_SCORE) * 100);
    if (reducedMotion) {
      nEl.textContent = score;
      marker.style.left = target + '%';
    } else {
      // Compteur + curseur animés (~800 ms, easing cubique).
      const start = performance.now();
      const DUR = 800;
      const frame = (now) => {
        const t = Math.min((now - start) / DUR, 1);
        const e = 1 - Math.pow(1 - t, 3);
        nEl.textContent = Math.round(score * e);
        marker.style.left = (target * e).toFixed(1) + '%';
        if (t < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }

    card.querySelector('#diag-cta').addEventListener('click', openModal);
    card.querySelector('#diag-restart').addEventListener('click', () => {
      answers.fill(null);
      renderQuestion(0);
    });
    keepInView();
  }

  // ── Modale contact (notification centrale, sans changer de page) ──
  const modal = document.getElementById('diag-modal');
  const modalCard = modal?.querySelector('.diag-modal-card');
  const closeBtn = document.getElementById('diag-modal-close');
  const form = document.getElementById('diag-form');
  let lastResult = null;
  let lastFocus = null;
  let modalTimer = null;
  const MODAL_OUT_MS = 300;

  function focusables() {
    return Array.from(modalCard.querySelectorAll('button, a[href], input, textarea'))
      .filter((el) => !el.disabled && el.offsetParent !== null);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables();
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function openModal() {
    if (!modal) return;
    if (modalTimer) { clearTimeout(modalTimer); modalTimer = null; }
    modal.hidden = false;
    // reflow pour déclencher la transition d'entrée
    void modalCard.offsetWidth;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    lastFocus = document.activeElement;
    // Focus sur le premier champ si le formulaire est visible, sinon sur la croix.
    const first = form && !form.hidden ? form.querySelector('#df-prenom') : closeBtn;
    (first || closeBtn).focus();
    document.addEventListener('keydown', onKeydown);
  }

  function closeModal() {
    modal.classList.remove('is-open');
    document.removeEventListener('keydown', onKeydown);
    document.body.style.overflow = '';
    if (modalTimer) clearTimeout(modalTimer);
    if (reducedMotion) {
      modal.hidden = true;
    } else {
      modalTimer = setTimeout(() => { modal.hidden = true; modalTimer = null; }, MODAL_OUT_MS);
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  closeBtn?.addEventListener('click', closeModal);
  modal?.querySelector('.diag-modal-backdrop')?.addEventListener('click', closeModal);

  // ── Envoi du formulaire (même API que le formulaire d'accueil) ──
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const btn = document.getElementById('df-submit');
    const error = document.getElementById('df-error');
    const originalHtml = btn.innerHTML;

    error.style.display = 'none';
    error.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Envoi en cours...';

    try {
      const data = Object.fromEntries(new FormData(form).entries());
      // Contexte du diagnostic joint au message (visible dans Pipedrive et l'email).
      if (lastResult) {
        const ctx = `[Diagnostic création de valeur : ${lastResult.score}/${MAX_SCORE} — ${lastResult.tier.badge}]`;
        data.message = data.message ? `${ctx}\n\n${data.message}` : ctx;
      }
      data.page_url = window.location.href;
      data.referrer = document.referrer;

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Form submission failed');

      form.hidden = true;
      document.getElementById('df-success').hidden = false;
      closeBtn.focus();
    } catch {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
      error.textContent = "L'envoi n'a pas abouti. Vous pouvez réessayer ou appeler le 06 67 10 46 98.";
      error.style.display = 'block';
    }
  });

  renderIntro();
})();
