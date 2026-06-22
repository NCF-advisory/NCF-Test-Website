/* ═══════════════════════════════════════════════════════════
   Page /estimation/ — estimateur de valeur d'entreprise.

   Méthode : capitalisation du résultat net.
     Valeur des titres (capitaux propres) = Résultat net / taux

   On affiche une FOURCHETTE (et non un prix figé) : le taux de
   capitalisation porte une incertitude, modélisée par une bande
   ± BAND autour du taux. Un taux plus haut donne une valeur plus
   basse, d'où :
     borne basse = RN / (taux + BAND)
     borne haute = RN / (taux − BAND)

   Le taux est calibré sur la taille et N'EST PAS exposé dans
   l'UI. On capitalise un flux qui revient aux seuls actionnaires :
   le résultat est directement une equity value, sans dette retranchée.

   UX : un clic déclenche un effet d'attente (spinner + barre +
   messages) DANS le panneau, puis le résultat se révèle au CENTRE
   de l'écran sous forme de notification modale (fourchette qui
   s'incrémente + gros bouton « Parler à un expert » + croix de
   fermeture). Seule la notification est cliquable.
   ═══════════════════════════════════════════════════════════ */
(() => {
  // Taux de capitalisation de base par segment de taille — non affiché publiquement.
  const TAUX = { tpe: 0.14, pme: 0.12, grande: 0.10 };

  // Prime / (décote) de WACC par secteur, en points de base (bps), appliquée au taux de base.
  // Source : Rapport Fusac France (Dealsuite) S2-2025 — WACC implicite dérivé du multiple
  // VE/EBITDA moyen sectoriel (Gordon g=0, k=50 %). Écart vs multiple moyen marché (5,25x).
  // Multiple élevé → WACC plus faible → décote (négatif) ; multiple faible → prime (positif).
  const ECART_BPS = {
    'logiciels': -303,
    'sante-pharma': -294,
    'services-info': -248,
    'services-entreprises': -26,
    'agroalimentaire': 9,
    'industrie': 68,
    'ecommerce': 112,
    'medias': 112,
    'distribution': 184,
    'hotellerie-tourisme': 211,
    'transport-logistique': 238,
    'commerce-gros': 298,
    'construction': 330,
  };

  const BAND = 0.01;             // demi-amplitude de la fourchette (± autour du taux)

  const RANGE_MAX = 1_000_000;   // borne haute du curseur (échelle resserrée pour les PME)
  const INPUT_MAX = 50_000_000;  // saisie libre tolérée au-delà du curseur
  const STEP_MS = 550;           // durée d'affichage d'un message de suspense
  const COUNT_MS = 1000;         // durée du comptage final
  const MODAL_OUT_MS = 300;      // doit couvrir la transition de sortie CSS de la modale
  // NB : la barre .est-compute-bar (CSS) dure STEPS.length × STEP_MS = 2200ms.

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const form = document.querySelector('.est-form');
  const result = document.getElementById('est-result');
  const modal = document.getElementById('est-modal');
  if (!form || !result || !modal) return;

  const secteurEl = document.getElementById('est-secteur');
  const rangeEl = document.getElementById('est-rn-range');
  const numberEl = document.getElementById('est-rn-number');
  const tailleEls = form.querySelectorAll('input[name="taille"]');
  const goEl = document.getElementById('est-go');
  const hintEl = document.getElementById('est-go-hint');
  const modalBody = document.getElementById('est-modal-body');
  const modalCard = modal.querySelector('.est-modal-card');
  const closeBtn = document.getElementById('est-modal-close');

  const groupFr = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

  // Format compact : « 923 k€ », « 1,86 M€ » — lisible, sans fausse précision.
  function compactEur(n) {
    n = Math.max(0, n);
    const k = Math.round(n / 1000);
    if (k < 1000) return groupFr.format(k) + ' k€';
    const m = n / 1_000_000;
    const dec = m < 10 ? 2 : 1;
    const f = Math.pow(10, dec);
    return (Math.round(m * f) / f).toLocaleString('fr-FR', { maximumFractionDigits: dec }) + ' M€';
  }

  const state = { secteur: '', taille: '', rn: 200_000 };

  // Jeton de course : invalide tout suspense/animation en cours quand on relance ou modifie une saisie.
  let runId = 0;
  let timers = [];
  let rafId = null;
  let lastFocus = null;
  let modalTimer = null;   // timer de masquage de la modale — distinct de `timers` (que cancelRun vide)

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const parseDigits = (str) => {
    const digits = String(str).replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  };

  function cancelRun() {
    runId++;
    timers.forEach(clearTimeout);
    timers = [];
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function computeRange() {
    const base = TAUX[state.taille];
    const tilt = ECART_BPS[state.secteur];
    if (base == null || tilt == null || state.rn <= 0) return null;
    // Taux effectif = WACC de base (taille) ± cote/décote sectorielle.
    const taux = base + tilt / 10000;
    const low = state.rn / (taux + BAND);
    const high = state.rn / (taux - BAND);
    const central = state.rn / taux;                      // valeur au taux pivot
    // Position de la valeur centrale dans la fourchette (1/x convexe → ~42-47 %).
    const pct = clamp(((central - low) / (high - low)) * 100, 0, 100);
    return { low, high, central, pct };
  }

  const ARROW = '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

  // ── Panneau (placeholder / suspense uniquement) ──────────────
  function showPlaceholder() {
    const ready = state.secteur && state.taille;
    const msg = ready
      ? 'Tout est prêt. Lancez l’estimation pour révéler votre fourchette de valeur.'
      : 'Renseignez vos trois critères, puis lancez l’estimation : votre fourchette de valeur apparaîtra ici.';
    result.className = 'est-result';
    result.removeAttribute('aria-busy');
    result.innerHTML = `
      <div class="est-result-placeholder">
        <span class="est-ph-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-6"/></svg>
        </span>
        <div>${msg}</div>
      </div>`;
  }

  function resetPanel() {
    cancelRun();
    showPlaceholder();
  }

  // ── Modale « notification centrale » ─────────────────────────
  function focusables() {
    return Array.from(modal.querySelectorAll('button, a[href]'))
      .filter((el) => !el.disabled);
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

  function openModal(html) {
    if (modalTimer) { clearTimeout(modalTimer); modalTimer = null; }
    modalBody.innerHTML = html;
    modal.hidden = false;
    // reflow pour déclencher la transition d'entrée
    void modalCard.offsetWidth;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    lastFocus = document.activeElement;
    closeBtn.focus();
    document.addEventListener('keydown', onKeydown);
  }

  function closeModal() {
    modal.classList.remove('is-open');
    document.removeEventListener('keydown', onKeydown);
    document.body.style.overflow = '';
    // Masquage différé pour laisser jouer la transition de sortie — timer dédié,
    // que resetPanel()/cancelRun() ne doit PAS effacer (sinon l'overlay reste et bloque les clics).
    if (modalTimer) clearTimeout(modalTimer);
    if (reducedMotion) {
      modal.hidden = true;
    } else {
      modalTimer = setTimeout(() => { modal.hidden = true; modalTimer = null; }, MODAL_OUT_MS);
    }
    resetPanel();
    if (goEl && !goEl.disabled) goEl.focus();
    else if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // ── Révélation animée : compteurs + remplissage de la jauge ──
  function animateReveal(myRun, range, els) {
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const apply = (e) => {
      els.low.textContent = compactEur(range.low * e);
      els.high.textContent = compactEur(range.high * e);
      els.mid.textContent = compactEur(range.central * e);
      els.fill.style.width = (e * 100).toFixed(1) + '%';
    };
    const frame = (now) => {
      if (myRun !== runId) return;
      const t = Math.min((now - start) / COUNT_MS, 1);
      apply(ease(t));
      if (t < 1) rafId = requestAnimationFrame(frame);
      else { apply(1); rafId = null; }
    };
    rafId = requestAnimationFrame(frame);
  }

  // ── Contenus de la modale ────────────────────────────────────
  function revealRange(myRun, range) {
    if (myRun !== runId) return;
    const pos = range.pct.toFixed(1) + '%';
    openModal(`
      <h2 id="est-modal-label" class="est-modal-label">Fourchette de valeur estimée</h2>
      <div class="est-gauge">
        <div class="est-gauge-ends">
          <div class="est-gauge-end">
            <span class="est-gauge-cap">Basse</span>
            <span class="est-val est-val-low">—</span>
          </div>
          <div class="est-gauge-end est-gauge-end-hi">
            <span class="est-gauge-cap">Haute</span>
            <span class="est-val est-val-high">—</span>
          </div>
        </div>
        <div class="est-gauge-track" aria-hidden="true">
          <div class="est-gauge-fill"></div>
          <span class="est-gauge-dot" style="left:0%"></span>
          <span class="est-gauge-dot" style="left:100%"></span>
          <span class="est-gauge-mark" style="left:${pos}"></span>
        </div>
        <div class="est-gauge-mid" style="left:${pos}">
          <span class="est-gauge-cap">Valeur centrale</span>
          <span class="est-val-mid">—</span>
        </div>
      </div>
      <p class="est-modal-unit">Valeur indicative de vos titres (capitaux propres), hors croissance et spécificités de votre dossier.</p>
      <a class="est-modal-cta" href="/#contact">Parler à un expert ${ARROW}</a>
      <p class="est-modal-fine">Une estimation n'est pas une évaluation : un échange permet d'obtenir une valeur fiable et défendable.</p>`);

    const els = {
      low: modalBody.querySelector('.est-val-low'),
      high: modalBody.querySelector('.est-val-high'),
      mid: modalBody.querySelector('.est-val-mid'),
      fill: modalBody.querySelector('.est-gauge-fill'),
    };
    if (reducedMotion) {
      els.low.textContent = compactEur(range.low);
      els.high.textContent = compactEur(range.high);
      els.mid.textContent = compactEur(range.central);
      els.fill.style.width = '100%';
    } else {
      animateReveal(myRun, range, els);
    }
    // Le panneau repasse en invitation derrière la modale.
    showPlaceholder();
  }

  function revealError() {
    openModal(`
      <h2 id="est-modal-label" class="est-modal-label">Estimation</h2>
      <p class="est-modal-unit-lg">La capitalisation suppose un bénéfice positif et récurrent.</p>
      <p class="est-modal-unit">Pour une société déficitaire ou à résultat exceptionnel, d'autres méthodes (actifs, comparables, flux futurs) s'imposent.</p>
      <a class="est-modal-cta" href="/#contact">Parler à un expert ${ARROW}</a>`);
    showPlaceholder();
  }

  const STEPS = [
    'Lecture de vos paramètres…',
    'Application de la capitalisation du résultat net…',
    'Calibrage sur votre secteur et votre taille…',
    'Constitution de votre fourchette de valeur…',
  ];

  // ── Déclenchement : suspense (panneau) puis révélation (modale)
  function runEstimation() {
    if (!state.secteur || !state.taille) return;
    cancelRun();
    const myRun = runId;

    if (state.rn <= 0) { revealError(); return; }
    const range = computeRange();

    if (reducedMotion) { revealRange(myRun, range); return; }

    result.className = 'est-result is-computing';
    result.setAttribute('aria-busy', 'true');
    result.innerHTML = `
      <div class="est-compute">
        <div class="est-spinner-ring" aria-hidden="true"></div>
        <div class="est-compute-msg">${STEPS[0]}</div>
        <div class="est-compute-bar" aria-hidden="true"><span></span></div>
      </div>`;
    const msgEl = result.querySelector('.est-compute-msg');

    let i = 1;
    const tick = () => {
      if (myRun !== runId) return;
      if (i < STEPS.length) {
        msgEl.textContent = STEPS[i];
        i++;
        timers.push(setTimeout(tick, STEP_MS));
      } else {
        revealRange(myRun, range);
      }
    };
    timers.push(setTimeout(tick, STEP_MS));
  }

  function updateGo() {
    const ok = !!(state.secteur && state.taille);
    goEl.disabled = !ok;
    goEl.classList.toggle('is-ready', ok);
    hintEl.textContent = ok
      ? 'Prêt — lancez l’estimation.'
      : 'Renseignez le secteur et la taille pour lancer l’estimation.';
  }

  // ── Écouteurs ────────────────────────────────────────────────
  secteurEl.addEventListener('change', () => {
    state.secteur = secteurEl.value;
    resetPanel();
    updateGo();
  });

  tailleEls.forEach((el) => {
    el.addEventListener('change', () => {
      if (el.checked) { state.taille = el.value; resetPanel(); updateGo(); }
    });
  });

  rangeEl.addEventListener('input', () => {
    state.rn = parseInt(rangeEl.value, 10);
    numberEl.value = groupFr.format(state.rn);
    resetPanel();
  });

  // Pendant la frappe : maj sans reformater (évite le saut de curseur).
  numberEl.addEventListener('input', () => {
    state.rn = clamp(parseDigits(numberEl.value), 0, INPUT_MAX);
    rangeEl.value = String(Math.min(state.rn, RANGE_MAX));
    resetPanel();
  });
  numberEl.addEventListener('blur', () => { numberEl.value = groupFr.format(state.rn); });
  numberEl.addEventListener('focus', () => { numberEl.select(); });

  goEl.addEventListener('click', runEstimation);
  closeBtn.addEventListener('click', closeModal);

  // ── Init ─────────────────────────────────────────────────────
  numberEl.value = groupFr.format(state.rn);
  rangeEl.value = String(Math.min(state.rn, RANGE_MAX));
  updateGo();
  showPlaceholder();
})();
