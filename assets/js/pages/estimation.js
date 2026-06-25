/* ═══════════════════════════════════════════════════════════
   Page /estimation/ — estimateur de valeur d'entreprise.

   Méthode : multiple d'EBITDA sectoriel (source : Fusacq).
     1. Valeur d'entreprise (VE) = EBITDA × multiple
        multiple = multiple sectoriel × (prime/décote de taille)
     2. Valeur des titres (capitaux propres) = VE + trésorerie nette
        trésorerie nette = trésorerie disponible − dette financière

   On affiche une FOURCHETTE (et non un prix figé) : une amplitude
   FIXE de ± SPREAD/2 autour de la valeur centrale des titres, soit
   20 % de large quel que soit le secteur ou la taille.

   La trésorerie et la dette sont saisies comme deux montants
   POSITIFS distincts : l'outil fait lui-même la soustraction, ce
   qui évite toute erreur de signe.

   UX : un clic déclenche un effet d'attente (spinner + barre +
   messages) DANS le panneau, puis le résultat se révèle au CENTRE
   de l'écran sous forme de notification modale (fourchette qui
   s'incrémente + gros bouton « Parler à un expert » + croix de
   fermeture). Seule la notification est cliquable.
   ═══════════════════════════════════════════════════════════ */
(() => {
  // Multiple moyen VE/EBITDA par secteur — source : Rapport Fusac France (Fusacq),
  // S2-2025, figure 6. Moyenne marché : 5,25x.
  const SECTEUR_MULT = {
    'logiciels': 7.7,
    'sante-pharma': 7.6,
    'services-info': 7.1,
    'services-entreprises': 5.4,
    'agroalimentaire': 5.2,
    'industrie': 4.9,
    'ecommerce': 4.7,
    'medias': 4.7,
    'distribution': 4.4,
    'hotellerie-tourisme': 4.3,
    'transport-logistique': 4.2,
    'commerce-gros': 4.0,
    'construction': 3.9,
  };

  const MARKET_AVG = 5.25;   // multiple moyen tous secteurs (Fusacq) — pivot de l'effet taille.

  // Effet de la taille sur le multiple — multiple moyen représentatif du segment,
  // dérivé de la courbe Fusacq (figure 8 : 3,9x à 200 k€ d'EBITDA → 6,9x à 10 M€).
  // Appliqué en proportion de la moyenne marché : un segment > 5,25 majore le
  // multiple sectoriel, un segment < 5,25 le minore.
  const TAILLE_MULT = { tpe: 4.0, pme: 5.5, eti: 6.9 };

  const SPREAD = 0.20;           // amplitude fixe de la fourchette (± SPREAD/2 autour de la valeur centrale)

  const RANGE_MAX = 2_000_000;   // borne haute du curseur EBITDA (échelle resserrée pour les PME)
  const INPUT_MAX = 500_000_000; // saisie libre tolérée au-delà du curseur (EBITDA / trésorerie / dette)
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
  const ebitdaRangeEl = document.getElementById('est-ebitda-range');
  const ebitdaNumberEl = document.getElementById('est-ebitda-number');
  const tresoEl = document.getElementById('est-treso');
  const detteEl = document.getElementById('est-dette');
  const netEl = document.getElementById('est-net');
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

  const state = { secteur: '', taille: '', ebitda: 200_000, treso: 0, dette: 0 };

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

  // Multiple effectif = multiple sectoriel × (multiple de taille / moyenne marché).
  function effectiveMultiple() {
    const sector = SECTEUR_MULT[state.secteur];
    const size = TAILLE_MULT[state.taille];
    if (sector == null || size == null) return null;
    return sector * (size / MARKET_AVG);
  }

  // Renvoie { ev, net, equity, low, high, multiple } ou null si données incomplètes.
  function computeValue() {
    const multiple = effectiveMultiple();
    if (multiple == null || state.ebitda <= 0) return null;
    const ev = state.ebitda * multiple;
    const net = state.treso - state.dette;
    const equity = ev + net;
    return {
      multiple,
      ev,
      net,
      equity,
      low: equity * (1 - SPREAD / 2),
      high: equity * (1 + SPREAD / 2),
    };
  }

  const ARROW = '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

  // ── Trésorerie nette : lecture en clair sous les deux saisies ──
  function updateNet() {
    if (!netEl) return;
    const net = state.treso - state.dette;
    let cls, tag, sign;
    if (net > 0) { cls = 'est-net-pos'; tag = 'Trésorerie nette positive'; sign = '+ '; }
    else if (net < 0) { cls = 'est-net-neg'; tag = 'Endettement net'; sign = '− '; }
    else { cls = 'est-net-zero'; tag = 'Équilibre'; sign = ''; }
    netEl.className = 'est-net ' + cls;
    netEl.innerHTML = `
      <span class="est-net-title">Trésorerie nette</span>
      <span class="est-net-calc">${groupFr.format(state.treso)} € − ${groupFr.format(state.dette)} € = <b>${sign}${groupFr.format(Math.abs(net))} €</b></span>
      <span class="est-net-tag">${tag}</span>`;
  }

  // ── Panneau (placeholder / suspense uniquement) ──────────────
  function showPlaceholder() {
    const ready = state.secteur && state.taille;
    const msg = ready
      ? 'Tout est prêt. Lancez l’estimation pour révéler votre fourchette de valeur.'
      : 'Renseignez vos critères, puis lancez l’estimation : votre fourchette de valeur apparaîtra ici.';
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
  function animateReveal(myRun, value, els) {
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const apply = (e) => {
      els.low.textContent = compactEur(value.low * e);
      els.high.textContent = compactEur(value.high * e);
      els.fill.style.width = (e * 100).toFixed(1) + '%';
      els.bridge.forEach((b) => { b.el.textContent = b.prefix + compactEur(b.target * e); });
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
  // Pont VE → titres : rend visible l'ajout de la trésorerie et le retrait de la dette.
  function bridgeHtml(value) {
    const hasTreso = state.treso > 0;
    const hasDette = state.dette > 0;
    if (!hasTreso && !hasDette) {
      return `<p class="est-modal-note">Vous n'avez saisi ni trésorerie ni dette : la <strong>valeur de vos titres</strong> est donc égale à la <strong>valeur d'entreprise</strong>, soit ${compactEur(value.ev)}.</p>`;
    }
    let rows = `
      <div class="est-bridge-row">
        <span class="est-bridge-lbl">Valeur d'entreprise<small>la valeur de l'activité, hors financement</small></span>
        <span class="est-bridge-amt" data-val="${value.ev}">—</span>
      </div>`;
    if (hasTreso) rows += `
      <div class="est-bridge-row est-bridge-op">
        <span class="est-bridge-lbl"><span class="est-op est-op-plus">+</span>Trésorerie disponible</span>
        <span class="est-bridge-amt" data-val="${state.treso}" data-prefix="+ ">—</span>
      </div>`;
    if (hasDette) rows += `
      <div class="est-bridge-row est-bridge-op">
        <span class="est-bridge-lbl"><span class="est-op est-op-minus">−</span>Dette financière</span>
        <span class="est-bridge-amt" data-val="${state.dette}" data-prefix="− ">—</span>
      </div>`;
    rows += `
      <div class="est-bridge-row est-bridge-total">
        <span class="est-bridge-lbl">Valeur de vos titres<small>ce qui revient à l'actionnaire</small></span>
        <span class="est-bridge-amt" data-val="${value.equity}">—</span>
      </div>`;
    return `<div class="est-bridge"><div class="est-bridge-title">De la valeur d'entreprise à la valeur de vos titres</div>${rows}</div>`;
  }

  function revealValue(myRun, value) {
    if (myRun !== runId) return;
    openModal(`
      <h2 id="est-modal-label" class="est-modal-label">Estimation de la valeur de vos titres</h2>
      ${bridgeHtml(value)}
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
        </div>
      </div>
      <p class="est-modal-unit">La <strong>valeur d'entreprise</strong> mesure votre activité seule ; la <strong>valeur des titres</strong> (capitaux propres) est ce qui revient à l'actionnaire, une fois la trésorerie ajoutée et la dette retirée.</p>
      <p class="est-modal-src">Multiples sectoriels : <strong>Fusacq</strong> (données S2-2025).</p>
      <a class="est-modal-cta" href="/#contact">Je veux un rapport d'évaluation ${ARROW}</a>
      <p class="est-modal-fine">Une estimation n'est pas une évaluation : un échange permet d'obtenir une valeur fiable et défendable.</p>`);

    const els = {
      low: modalBody.querySelector('.est-val-low'),
      high: modalBody.querySelector('.est-val-high'),
      fill: modalBody.querySelector('.est-gauge-fill'),
      bridge: Array.from(modalBody.querySelectorAll('.est-bridge-amt[data-val]')).map((el) => ({
        el, target: Number(el.dataset.val), prefix: el.dataset.prefix || '',
      })),
    };
    if (reducedMotion) {
      els.low.textContent = compactEur(value.low);
      els.high.textContent = compactEur(value.high);
      els.fill.style.width = '100%';
      els.bridge.forEach((b) => { b.el.textContent = b.prefix + compactEur(b.target); });
    } else {
      animateReveal(myRun, value, els);
    }
    // Le panneau repasse en invitation derrière la modale.
    showPlaceholder();
  }

  // EBITDA nul ou négatif : le multiple n'a pas de sens.
  function revealNoEbitda() {
    openModal(`
      <h2 id="est-modal-label" class="est-modal-label">Estimation</h2>
      <p class="est-modal-unit-lg">La valorisation par multiple suppose un EBITDA positif et récurrent.</p>
      <p class="est-modal-unit">Pour une société à EBITDA négatif ou exceptionnel, d'autres méthodes (actifs, comparables, flux futurs) s'imposent.</p>
      <a class="est-modal-cta" href="/#contact">Je veux un rapport d'évaluation ${ARROW}</a>`);
    showPlaceholder();
  }

  // Dette nette supérieure à la valeur d'entreprise : titres nuls ou négatifs.
  function revealNegativeEquity() {
    openModal(`
      <h2 id="est-modal-label" class="est-modal-label">Estimation</h2>
      <p class="est-modal-unit-lg">Votre dette financière dépasse la valeur d'entreprise estimée.</p>
      <p class="est-modal-unit">Sur cette première approche, la valeur des titres ressortirait nulle ou négative : la structure financière devient l'enjeu central. C'est exactement le type de situation à cadrer ensemble.</p>
      <a class="est-modal-cta" href="/#contact">Je veux un rapport d'évaluation ${ARROW}</a>`);
    showPlaceholder();
  }

  const STEPS = [
    'Lecture de vos paramètres…',
    'Application du multiple d’EBITDA sectoriel…',
    'Ajustement selon votre secteur et votre taille…',
    'Pont vers la valeur de vos titres (trésorerie nette)…',
  ];

  // ── Déclenchement : suspense (panneau) puis révélation (modale)
  function runEstimation() {
    if (!state.secteur || !state.taille) return;
    cancelRun();
    const myRun = runId;

    if (state.ebitda <= 0) { revealNoEbitda(); return; }
    const value = computeValue();
    if (!value) { revealNoEbitda(); return; }

    const reveal = value.equity <= 0
      ? () => revealNegativeEquity()
      : () => revealValue(myRun, value);

    if (reducedMotion) { reveal(); return; }

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
        reveal();
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

  ebitdaRangeEl.addEventListener('input', () => {
    state.ebitda = parseInt(ebitdaRangeEl.value, 10);
    ebitdaNumberEl.value = groupFr.format(state.ebitda);
    resetPanel();
  });

  // Pendant la frappe : maj sans reformater (évite le saut de curseur).
  ebitdaNumberEl.addEventListener('input', () => {
    state.ebitda = clamp(parseDigits(ebitdaNumberEl.value), 0, INPUT_MAX);
    ebitdaRangeEl.value = String(Math.min(state.ebitda, RANGE_MAX));
    resetPanel();
  });
  ebitdaNumberEl.addEventListener('blur', () => { ebitdaNumberEl.value = groupFr.format(state.ebitda); });
  ebitdaNumberEl.addEventListener('focus', () => { ebitdaNumberEl.select(); });

  // Trésorerie et dette : deux montants positifs, soustraction faite par l'outil.
  tresoEl.addEventListener('input', () => {
    state.treso = clamp(parseDigits(tresoEl.value), 0, INPUT_MAX);
    updateNet();
    resetPanel();
  });
  tresoEl.addEventListener('blur', () => { tresoEl.value = groupFr.format(state.treso); });
  tresoEl.addEventListener('focus', () => { tresoEl.select(); });

  detteEl.addEventListener('input', () => {
    state.dette = clamp(parseDigits(detteEl.value), 0, INPUT_MAX);
    updateNet();
    resetPanel();
  });
  detteEl.addEventListener('blur', () => { detteEl.value = groupFr.format(state.dette); });
  detteEl.addEventListener('focus', () => { detteEl.select(); });

  goEl.addEventListener('click', runEstimation);
  closeBtn.addEventListener('click', closeModal);

  // ── Init ─────────────────────────────────────────────────────
  ebitdaNumberEl.value = groupFr.format(state.ebitda);
  ebitdaRangeEl.value = String(Math.min(state.ebitda, RANGE_MAX));
  tresoEl.value = groupFr.format(state.treso);
  detteEl.value = groupFr.format(state.dette);
  updateNet();
  updateGo();
  showPlaceholder();
})();
