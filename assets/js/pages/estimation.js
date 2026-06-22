/* ═══════════════════════════════════════════════════════════
   Page /estimation/ — estimateur de valeur d'entreprise.

   Méthode : capitalisation du résultat net.
     Valeur des titres (capitaux propres) = Résultat net / taux

   Le taux de capitalisation est calibré sur la taille de la
   société et N'EST PAS exposé dans l'interface (décision
   produit). Comme on capitalise un flux qui revient aux seuls
   actionnaires, le résultat est directement une equity value :
   on ne retranche aucune dette.
   ═══════════════════════════════════════════════════════════ */
(() => {
  // Taux de capitalisation par segment de taille — non affiché publiquement.
  const TAUX = { tpe: 0.14, pme: 0.12, grande: 0.10 };

  const RANGE_MAX = 5_000_000;   // borne haute du curseur
  const INPUT_MAX = 50_000_000;  // saisie libre tolérée au-delà du curseur

  const form = document.querySelector('.est-form');
  const result = document.getElementById('est-result');
  if (!form || !result) return;

  const secteurEl = document.getElementById('est-secteur');
  const rangeEl = document.getElementById('est-rn-range');
  const numberEl = document.getElementById('est-rn-number');
  const tailleEls = form.querySelectorAll('input[name="taille"]');

  const eur = new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  });
  const groupFr = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

  const state = { secteur: '', taille: '', rn: 200_000 };

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const parseDigits = (str) => {
    const digits = String(str).replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  };

  // ── Synchronisation curseur ⇄ champ ──────────────────────────
  function syncFromRange() {
    state.rn = parseInt(rangeEl.value, 10);
    numberEl.value = groupFr.format(state.rn);
    render();
  }

  // ── Calcul ───────────────────────────────────────────────────
  function estimate() {
    const taux = TAUX[state.taille];
    if (!taux) return null;
    const raw = state.rn / taux;
    // Arrondi à la dizaine de milliers d'euros : on évite une fausse précision.
    return Math.round(raw / 10_000) * 10_000;
  }

  // ── Rendu du panneau résultat ────────────────────────────────
  function render() {
    result.classList.remove('is-error');

    // État initial : critères incomplets.
    if (!state.secteur || !state.taille) {
      result.innerHTML = `
        <div class="est-result-placeholder">
          <span class="est-ph-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-6"/></svg>
          </span>
          <div>Choisissez votre <strong>secteur</strong> et votre <strong>taille</strong>, ajustez votre <strong>résultat net</strong> : votre estimation s'affiche ici en temps réel.</div>
        </div>`;
      return;
    }

    // Résultat net nul ou négatif : la méthode ne s'applique pas.
    if (state.rn <= 0) {
      result.classList.add('is-error');
      result.innerHTML = `
        <div class="est-result-label">Estimation</div>
        <div class="est-result-value">La capitalisation suppose un bénéfice positif et récurrent.</div>
        <p class="est-result-method">Pour une société déficitaire ou à résultat exceptionnel, d'autres méthodes (actifs, comparables, flux futurs) s'imposent. Parlons-en.</p>
        <a class="est-result-cta" href="/#contact">Échanger avec un expert
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>`;
      return;
    }

    const value = estimate();
    result.innerHTML = `
      <div class="est-result-label">Valeur indicative de vos titres</div>
      <div class="est-result-value">${eur.format(value)}</div>
      <div class="est-result-unit">Valeur des capitaux propres · estimation</div>
      <p class="est-result-method">Estimation par capitalisation de votre résultat net, calibrée sur la taille de votre société. Chiffre indicatif, hors croissance et spécificités de votre dossier.</p>
      <a class="est-result-cta" href="/#contact">Affiner avec un expert
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>`;
  }

  // ── Écouteurs ────────────────────────────────────────────────
  secteurEl.addEventListener('change', () => { state.secteur = secteurEl.value; render(); });

  tailleEls.forEach((el) => {
    el.addEventListener('change', () => { if (el.checked) { state.taille = el.value; render(); } });
  });

  rangeEl.addEventListener('input', syncFromRange);

  // Pendant la frappe : on met à jour la valeur sans reformater (évite le saut de curseur).
  numberEl.addEventListener('input', () => {
    state.rn = clamp(parseDigits(numberEl.value), 0, INPUT_MAX);
    rangeEl.value = String(Math.min(state.rn, RANGE_MAX));
    render();
  });
  // À la sortie du champ : on reformate proprement « 1 200 000 ».
  numberEl.addEventListener('blur', () => {
    numberEl.value = groupFr.format(state.rn);
  });
  numberEl.addEventListener('focus', () => { numberEl.select(); });

  // ── Init ─────────────────────────────────────────────────────
  numberEl.value = groupFr.format(state.rn);
  rangeEl.value = String(Math.min(state.rn, RANGE_MAX));
  render();
})();
