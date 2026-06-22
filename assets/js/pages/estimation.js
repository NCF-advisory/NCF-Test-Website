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
   le résultat est directement une equity value, sans retrancher
   de dette.

   UX : l'estimation n'est pas instantanée. Un clic déclenche un
   effet d'attente (messages + barre + spinner), puis la fourchette
   se révèle en s'incrémentant — pour créer de l'engagement.
   ═══════════════════════════════════════════════════════════ */
(() => {
  // Taux de capitalisation par segment — non affiché publiquement.
  const TAUX = { tpe: 0.14, pme: 0.12, grande: 0.10 };
  const BAND = 0.01;             // demi-amplitude de la fourchette (± autour du taux)

  const RANGE_MAX = 5_000_000;   // borne haute du curseur
  const INPUT_MAX = 50_000_000;  // saisie libre tolérée au-delà du curseur
  const STEP_MS = 550;           // durée d'affichage d'un message de suspense
  const COUNT_MS = 1000;         // durée du comptage final
  // NB : la barre .est-compute-bar (CSS) dure STEPS.length × STEP_MS = 2200ms.

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const form = document.querySelector('.est-form');
  const result = document.getElementById('est-result');
  if (!form || !result) return;

  const secteurEl = document.getElementById('est-secteur');
  const rangeEl = document.getElementById('est-rn-range');
  const numberEl = document.getElementById('est-rn-number');
  const tailleEls = form.querySelectorAll('input[name="taille"]');
  const goEl = document.getElementById('est-go');
  const hintEl = document.getElementById('est-go-hint');

  const eur = new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  });
  const groupFr = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

  const state = { secteur: '', taille: '', rn: 200_000 };

  // Jeton de course : invalide tout suspense/animation en cours quand on relance ou modifie une saisie.
  let runId = 0;
  let timers = [];
  let rafId = null;

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const round10k = (n) => Math.round(n / 10_000) * 10_000;
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
    const taux = TAUX[state.taille];
    if (!taux || state.rn <= 0) return null;
    return {
      low: round10k(state.rn / (taux + BAND)),
      high: round10k(state.rn / (taux - BAND)),
    };
  }

  const ARROW = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

  // ── États du panneau résultat ────────────────────────────────
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

  function showError() {
    result.className = 'est-result is-error';
    result.removeAttribute('aria-busy');
    result.innerHTML = `
      <div class="est-result-label">Estimation</div>
      <div class="est-result-value">La capitalisation suppose un bénéfice positif et récurrent.</div>
      <p class="est-result-method">Pour une société déficitaire ou à résultat exceptionnel, d'autres méthodes (actifs, comparables, flux futurs) s'imposent. Parlons-en.</p>
      <a class="est-result-cta" href="/#contact">Échanger avec un expert ${ARROW}</a>`;
  }

  function countUp(myRun, targets) {
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const frame = (now) => {
      if (myRun !== runId) return;
      const t = Math.min((now - start) / COUNT_MS, 1);
      const e = ease(t);
      targets.forEach(({ el, to }) => { el.textContent = eur.format(round10k(to * e)); });
      if (t < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        targets.forEach(({ el, to }) => { el.textContent = eur.format(to); });
        rafId = null;
      }
    };
    rafId = requestAnimationFrame(frame);
  }

  function reveal(myRun, range) {
    if (myRun !== runId) return;
    result.className = 'est-result is-revealed';
    result.removeAttribute('aria-busy');
    result.innerHTML = `
      <div class="est-result-label">Fourchette de valeur estimée</div>
      <div class="est-range-display">
        <span class="est-val est-val-low">—</span>
        <span class="est-range-dash" aria-hidden="true">–</span>
        <span class="est-val est-val-high">—</span>
      </div>
      <div class="est-result-unit">Valeur des capitaux propres (vos titres) · estimation indicative</div>
      <p class="est-result-method">Fourchette issue de la capitalisation de votre résultat net, calibrée sur votre taille. L'amplitude reflète l'incertitude sur le rendement attendu ; elle n'intègre ni la croissance ni les spécificités de votre dossier.</p>
      <a class="est-result-cta" href="/#contact">Affiner avec un expert ${ARROW}</a>`;

    const lowEl = result.querySelector('.est-val-low');
    const highEl = result.querySelector('.est-val-high');
    if (reducedMotion) {
      lowEl.textContent = eur.format(range.low);
      highEl.textContent = eur.format(range.high);
    } else {
      countUp(myRun, [{ el: lowEl, to: range.low }, { el: highEl, to: range.high }]);
    }
  }

  const STEPS = [
    'Lecture de vos paramètres…',
    'Application de la capitalisation du résultat net…',
    'Calibrage sur votre secteur et votre taille…',
    'Constitution de votre fourchette de valeur…',
  ];

  // ── Déclenchement : suspense puis révélation ─────────────────
  function runEstimation() {
    if (!state.secteur || !state.taille) return;
    cancelRun();
    const myRun = runId;

    if (state.rn <= 0) { showError(); return; }
    const range = computeRange();

    if (reducedMotion) { reveal(myRun, range); return; }

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
        reveal(myRun, range);
      }
    };
    timers.push(setTimeout(tick, STEP_MS));
  }

  function resetPanel() {
    cancelRun();
    showPlaceholder();
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

  // ── Init ─────────────────────────────────────────────────────
  numberEl.value = groupFr.format(state.rn);
  rangeEl.value = String(Math.min(state.rn, RANGE_MAX));
  updateGo();
  showPlaceholder();
})();
