(() => {
  'use strict';

  const SECTEUR_MULT = {logiciels:7.7,'sante-pharma':7.6,'services-info':7.1,'services-entreprises':5.4,agroalimentaire:5.2,industrie:4.9,ecommerce:4.7,medias:4.7,distribution:4.4,'hotellerie-tourisme':4.3,'transport-logistique':4.2,'commerce-gros':4.0,construction:3.9};
  const TAILLE_MULT = {tpe:4.0,pme:5.5,eti:6.9};
  const MARKET_AVG = 5.25, SPREAD = 0.10, RANGE_MAX = 2000000, INPUT_MAX = 500000000;
  const SECTEUR_LABELS = {logiciels:'Logiciels','sante-pharma':'Santé & Pharma','services-info':'Services informatiques','services-entreprises':'Services aux entreprises',agroalimentaire:'Agro-alimentaire',industrie:'Industrie',ecommerce:'E-commerce',medias:'Médias & Communication',distribution:'Distribution','hotellerie-tourisme':'Hôtellerie & Tourisme','transport-logistique':'Transport & Logistique','commerce-gros':'Commerce de gros',construction:'Construction'};
  const TAILLE_LABELS = {tpe:'TPE',pme:'PME',eti:'ETI'};
  const ARROW = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

  const groupFr = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  function compactEur(n){ n = Math.max(0, n); const k = Math.round(n/1000); if (k < 1000) return groupFr.format(k) + ' k€'; const m = n/1e6; const dec = m < 10 ? 2 : 1; const f = Math.pow(10, dec); return (Math.round(m*f)/f).toLocaleString('fr-FR', { maximumFractionDigits: dec }) + ' M€'; }
  function fmtMult(m){ return (Math.round(m*10)/10).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '×'; }
  function fmtNet(n){ if (n > 0) return '+ ' + compactEur(n); if (n < 0) return '− ' + compactEur(Math.abs(n)); return '0 €'; }
  const clamp = (n,a,b) => Math.min(Math.max(n,a),b);
  const parseDigits = (s) => { const d = String(s).replace(/[^\d]/g, ''); return d ? parseInt(d,10) : 0; };

  const state = { secteur:'', taille:'', ebitda:200000, treso:0, dette:0 };

  function effectiveMultiple(){ const s = SECTEUR_MULT[state.secteur], t = TAILLE_MULT[state.taille]; if (s == null || t == null) return null; return s * (t / MARKET_AVG); }
  function computeValue(){ const m = effectiveMultiple(); if (m == null || state.ebitda <= 0) return null; const ev = state.ebitda * m; const net = state.treso - state.dette; const equity = ev + net; return { multiple:m, ev, net, equity, low: ev*(1-SPREAD/2) + net, high: ev*(1+SPREAD/2) + net }; }

  function buildData(v){ return {
    secteur: SECTEUR_LABELS[state.secteur] || '', taille: TAILLE_LABELS[state.taille] || '',
    mult: fmtMult(v.multiple), ev: compactEur(v.ev), treso: compactEur(state.treso), dette: compactEur(state.dette),
    net: fmtNet(v.net), equity: compactEur(v.equity), low: compactEur(v.low), high: compactEur(v.high),
    hasTreso: state.treso > 0, hasDette: state.dette > 0,
  }; }

  function renderV1(d){
    let bridge;
    if (!d.hasTreso && !d.hasDette){
      bridge = `<p class="v1-note">Vous n'avez saisi ni trésorerie ni dette : la <strong>valeur de vos titres</strong> est égale à la <strong>valeur d'entreprise</strong>, soit ${d.ev}.</p>`;
    } else {
      let rows = `<div class="v1-row"><span class="v1-lbl">Valeur d'entreprise</span><span class="v1-amt">${d.ev}</span></div>`;
      if (d.hasTreso) rows += `<div class="v1-row v1-op"><span class="v1-lbl"><span class="v1-badge v1-plus">+</span>Trésorerie disponible</span><span class="v1-amt">+ ${d.treso}</span></div>`;
      if (d.hasDette) rows += `<div class="v1-row v1-op"><span class="v1-lbl"><span class="v1-badge v1-minus">−</span>Dette financière</span><span class="v1-amt">− ${d.dette}</span></div>`;
      rows += `<div class="v1-row v1-total"><span class="v1-lbl">Valeur de vos titres</span><span class="v1-amt">${d.equity}</span></div>`;
      bridge = `<div class="v1-bridge"><div class="v1-bridge-title">De la valeur d'entreprise à la valeur de vos titres</div>${rows}</div>`;
    }
    return `<section class="v1"><div class="v1-card">
      <p class="v1-label">Estimation de la valeur de vos titres</p>
      ${bridge}
      <div class="v1-gauge"><div class="v1-ends"><div class="v1-end"><span class="v1-cap">Basse</span><span class="v1-val">${d.low}</span></div><div class="v1-end v1-end-hi"><span class="v1-cap">Haute</span><span class="v1-val v1-val-hi">${d.high}</span></div></div><div class="v1-track"><div class="v1-fill"></div><span class="v1-dot" style="left:0%"></span><span class="v1-dot" style="left:100%"></span></div></div>
      <p class="v1-unit">La <strong>valeur d'entreprise</strong> mesure votre activité seule ; la <strong>valeur des titres</strong> (capitaux propres) est ce qui revient à l'actionnaire, une fois la trésorerie ajoutée et la dette retirée.</p>
      <p class="v1-src">Multiples sectoriels : <strong>Fusacq</strong> (données S2-2025).</p>
      <a class="v1-cta" href="/#contact">Je veux un rapport d'évaluation ${ARROW}</a>
    </div></section>`;
  }

function renderV2(d) {
  return `<section class="v2">
  <div class="v2-panel">

    <header class="v2-head">
      <span class="v2-eyebrow">Estimation indicative</span>
      <p class="v2-context">${d.taille} · secteur ${d.secteur} · multiple effectif <strong>${d.mult}</strong></p>
    </header>

    <div class="v2-cols">

      <!-- COLONNE GAUCHE : la fourchette -->
      <div class="v2-range">
        <p class="v2-label">Valeur des titres — fourchette estimée</p>

        <div class="v2-central">
          <span class="v2-central-val">${d.equity}</span>
          <span class="v2-central-tag">valeur centrale</span>
        </div>

        <div class="v2-gauge" aria-hidden="true">
          <div class="v2-gauge-track">
            <span class="v2-gauge-fill"></span>
            <span class="v2-gauge-mark"></span>
          </div>
        </div>

        <div class="v2-bounds">
          <div class="v2-bound">
            <span class="v2-bound-tag">basse</span>
            <span class="v2-bound-val">${d.low}</span>
          </div>
          <div class="v2-bound v2-bound-hi">
            <span class="v2-bound-tag">haute</span>
            <span class="v2-bound-val">${d.high}</span>
          </div>
        </div>

        <p class="v2-amp">Amplitude &#177;&#8201;10&#8201;%</p>
      </div>

      <!-- COLONNE DROITE : le pont -->
      <div class="v2-bridge">
        <p class="v2-label">Du résultat à la valeur des titres</p>

        <table class="v2-table">
          <tbody>
            <tr>
              <th scope="row">Valeur d'entreprise (VE)</th>
              <td class="v2-num">${d.ev}</td>
            </tr>
            <tr>
              <th scope="row"><span class="v2-sign v2-plus">+</span> Trésorerie disponible</th>
              <td class="v2-num">${d.treso}</td>
            </tr>
            <tr>
              <th scope="row"><span class="v2-sign v2-minus">&#8722;</span> Dette financière</th>
              <td class="v2-num">${d.dette}</td>
            </tr>
            <tr class="v2-row-net">
              <th scope="row">Trésorerie nette</th>
              <td class="v2-num">${d.net}</td>
            </tr>
            <tr class="v2-row-total">
              <th scope="row"><span class="v2-eq">=</span> Valeur des titres</th>
              <td class="v2-num">${d.equity}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

    <footer class="v2-foot">
      <p class="v2-source">Source : Fusacq — données S2-2025</p>
      <a class="v2-cta" href="/#contact">
        Je veux un rapport d'évaluation
        <svg class="v2-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
    </footer>

  </div>
</section>`;
}

function renderV3(d) {
  return `<section class="v3">
  <header class="v3-head">
    <p class="v3-eyebrow">De la valeur d'entreprise à la valeur des titres</p>
    <h2 class="v3-title">La cascade de valorisation</h2>
    <p class="v3-context">
      <span>${d.taille}</span><i></i><span>Secteur ${d.secteur}</span><i></i><span>Multiple effectif <strong>${d.mult}</strong></span>
    </p>
  </header>

  <ol class="v3-flow">
    <li class="v3-step v3-step--base">
      <span class="v3-node" aria-hidden="true"></span>
      <div class="v3-card">
        <div class="v3-line">
          <span class="v3-lbl">Valeur d'entreprise<small>VE — activité opérationnelle</small></span>
          <span class="v3-amt">${d.ev}</span>
        </div>
      </div>
    </li>

    <li class="v3-step v3-step--op v3-step--plus">
      <span class="v3-node v3-node--sign" aria-hidden="true">+</span>
      <div class="v3-card">
        <div class="v3-line">
          <span class="v3-lbl">Trésorerie disponible<small>à additionner</small></span>
          <span class="v3-amt v3-amt--pos">+ ${d.treso}</span>
        </div>
      </div>
    </li>

    <li class="v3-step v3-step--op v3-step--minus">
      <span class="v3-node v3-node--sign" aria-hidden="true">&minus;</span>
      <div class="v3-card">
        <div class="v3-line">
          <span class="v3-lbl">Dette financière<small>à soustraire</small></span>
          <span class="v3-amt">&minus; ${d.dette}</span>
        </div>
        <p class="v3-sub">Trésorerie nette&nbsp;: <strong>${d.net}</strong></p>
      </div>
    </li>

    <li class="v3-step v3-step--total">
      <span class="v3-node v3-node--total" aria-hidden="true">=</span>
      <div class="v3-card v3-card--total">
        <div class="v3-line">
          <span class="v3-lbl">Valeur des titres<small>valeur centrale</small></span>
          <span class="v3-amt v3-amt--total">${d.equity}</span>
        </div>
      </div>
    </li>
  </ol>

  <div class="v3-range">
    <p class="v3-range-cap">Fourchette d'évaluation <span>&plusmn; 5 %</span></p>
    <div class="v3-range-bounds">
      <div class="v3-bound">
        <span class="v3-bound-tag">Basse</span>
        <span class="v3-bound-val">${d.low}</span>
      </div>
      <div class="v3-range-track" aria-hidden="true">
        <span class="v3-range-fill"></span>
        <span class="v3-range-pin"></span>
      </div>
      <div class="v3-bound v3-bound--hi">
        <span class="v3-bound-tag">Haute</span>
        <span class="v3-bound-val">${d.high}</span>
      </div>
    </div>
  </div>

  <a class="v3-cta" href="/#contact">
    Je veux un rapport d'évaluation
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="12" x2="19" y2="12"></line><polyline points="13 6 19 12 13 18"></polyline></svg>
  </a>

  <p class="v3-src">Source&nbsp;: <strong>Fusacq</strong> — données S2-2025</p>
</section>`;
}

function renderV4(d) {
  return `<section class="v4">
  <div class="v4-card">
    <p class="v4-context">${d.taille} &middot; ${d.secteur} &middot; multiple ${d.mult}</p>

    <p class="v4-label">Valeur des titres</p>
    <p class="v4-value">${d.equity}</p>
    <p class="v4-range">${d.low} &ndash; ${d.high}<span class="v4-range-note"> &middot; fourchette &plusmn;&nbsp;5&nbsp;%</span></p>

    <p class="v4-bridge">
      <span class="v4-b-ve">${d.ev}</span>
      <span class="v4-b-op">+</span><span class="v4-b-cash">${d.treso}</span>
      <span class="v4-b-op">&minus;</span><span class="v4-b-debt">${d.dette}</span>
      <span class="v4-b-eq">=</span><span class="v4-b-res">${d.equity}</span>
    </p>
    <p class="v4-bridge-leg">VE&nbsp;+&nbsp;tr&eacute;sorerie&nbsp;&minus;&nbsp;dette&nbsp;=&nbsp;valeur des titres</p>

    <a class="v4-cta" href="/#contact">Je veux un rapport d'&eacute;valuation <span class="v4-arrow" aria-hidden="true">&rarr;</span></a>

    <p class="v4-source">Source : Fusacq &mdash; donn&eacute;es S2-2025</p>
  </div>
</section>`;
}

function renderV5(d) {
  return `<section class="v5">
  <div class="v5-board">

    <header class="v5-head">
      <span class="v5-eyebrow">Synthèse d'évaluation</span>
      <div class="v5-context">
        <span class="v5-chip">${d.taille}</span>
        <span class="v5-chip">${d.secteur}</span>
        <span class="v5-chip v5-chip-accent">Multiple effectif ${d.mult}</span>
      </div>
    </header>

    <div class="v5-tiles">
      <div class="v5-tile">
        <span class="v5-tile-label">Valeur d'entreprise</span>
        <span class="v5-tile-val">${d.ev}</span>
        <span class="v5-tile-foot">VE retenue</span>
      </div>
      <div class="v5-tile v5-tile-accent">
        <span class="v5-tile-label">Trésorerie nette</span>
        <span class="v5-tile-val">${d.net}</span>
        <span class="v5-tile-foot">${d.treso} &minus; ${d.dette}</span>
      </div>
      <div class="v5-tile v5-tile-strong">
        <span class="v5-tile-label">Valeur des titres</span>
        <span class="v5-tile-val">${d.equity}</span>
        <span class="v5-tile-foot">Valeur centrale</span>
      </div>
    </div>

    <div class="v5-bridge" aria-label="Pont de calcul : valeur d'entreprise plus trésorerie disponible moins dette financière égale valeur des titres">
      <span class="v5-bridge-term">VE <strong>${d.ev}</strong></span>
      <span class="v5-bridge-op v5-op-plus">+</span>
      <span class="v5-bridge-term">Trésorerie <strong>${d.treso}</strong></span>
      <span class="v5-bridge-op v5-op-minus">&minus;</span>
      <span class="v5-bridge-term">Dette <strong>${d.dette}</strong></span>
      <span class="v5-bridge-op v5-op-eq">=</span>
      <span class="v5-bridge-term v5-bridge-res">Titres <strong>${d.equity}</strong></span>
    </div>

    <div class="v5-range">
      <div class="v5-range-head">
        <span class="v5-range-title">Fourchette de valorisation <span class="v5-range-pm">&plusmn;&nbsp;5&nbsp;%</span></span>
      </div>
      <div class="v5-range-bar">
        <span class="v5-range-fill"></span>
        <span class="v5-range-marker" style="left:50%"></span>
      </div>
      <div class="v5-range-scale">
        <span class="v5-range-edge">
          <span class="v5-range-cap">Basse</span>
          <span class="v5-range-num">${d.low}</span>
        </span>
        <span class="v5-range-edge v5-range-mid">
          <span class="v5-range-cap">Centrale</span>
          <span class="v5-range-num">${d.equity}</span>
        </span>
        <span class="v5-range-edge v5-range-end">
          <span class="v5-range-cap">Haute</span>
          <span class="v5-range-num">${d.high}</span>
        </span>
      </div>
    </div>

    <footer class="v5-foot">
      <span class="v5-source">
        <svg class="v5-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 1.5 4.3 8 7l6.5-2.7L8 1.5Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M2 7.2v3.6c0 .5 2.7 2.2 6 2.2s6-1.7 6-2.2V7.2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
        Source&nbsp;: <strong>Fusacq</strong> &mdash; données S2-2025
      </span>
      <a class="v5-cta" href="/#contact">Je veux un rapport d'évaluation <span class="v5-arrow" aria-hidden="true">&rarr;</span></a>
    </footer>

  </div>
</section>`;
}

  const RENDERERS = { 1: renderV1, 2: renderV2, 3: renderV3, 4: renderV4, 5: renderV5 };
  let activeStyle = 1;
  function applyLayout(){ const b = document.body; b.classList.remove('layout-v1','layout-v2','layout-v3','layout-v4','layout-v5'); b.classList.add('layout-v' + activeStyle); }

  // ── Habillage du panneau droit (variante Principale) — « Posture » ──
  const CHECK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>';
  function renderPanel(){
    const result = document.getElementById('est-result');
    if (!result) return;
    result.innerHTML = `<div class="panel panel-d"><p class="panel-lead">Une première estimation de la valeur de vos <b>titres</b>, en une minute.</p><ul class="panel-checks">` + ['Multiples de transactions réelles (Fusacq)', 'Sans engagement, sans création de compte', 'Confidentiel'].map((t) => `<li>${CHECK}${t}</li>`).join('') + `</ul><p class="panel-sign">— Novances Évaluation</p></div>`;
  }

  function msgCard(t){ return `<section class="v1"><div class="v1-card"><p class="v1-label">Estimation</p><p class="v1-unit" style="font-size:1rem;color:var(--text-strong)">${t}</p><a class="v1-cta" href="/#contact">Je veux un rapport d'évaluation ${ARROW}</a></div></section>`; }

  function currentResultHTML(){
    const v = computeValue();
    if (!v) return msgCard("La valorisation par multiple suppose un EBITDA positif et récurrent. Pour un EBITDA négatif ou exceptionnel, d'autres méthodes (actifs, comparables, flux futurs) s'imposent.");
    if (v.equity <= 0) return msgCard("Votre dette financière dépasse la valeur d'entreprise estimée : sur cette première approche, la valeur des titres ressort nulle ou négative. La structure financière devient l'enjeu central.");
    return RENDERERS[activeStyle](buildData(v));
  }

  const form = document.querySelector('.est-form');
  const secteurEl = document.getElementById('est-secteur');
  const ebitdaRangeEl = document.getElementById('est-ebitda-range');
  const ebitdaNumberEl = document.getElementById('est-ebitda-number');
  const tresoEl = document.getElementById('est-treso');
  const detteEl = document.getElementById('est-dette');
  const netEl = document.getElementById('est-net');
  const tailleEls = form.querySelectorAll('input[name="taille"]');
  const goEl = document.getElementById('est-go');
  const hintEl = document.getElementById('est-go-hint');
  const modal = document.getElementById('demo-modal');
  const stage = document.getElementById('demo-stage');
  const closeBtn = document.getElementById('demo-close');
  const styleBtns = document.querySelectorAll('.demo-style');

  function updateNet(){
    if (!netEl) return;
    const net = state.treso - state.dette;
    let cls, tag, sign;
    if (net > 0){ cls='est-net-pos'; tag='Trésorerie nette positive'; sign='+ '; }
    else if (net < 0){ cls='est-net-neg'; tag='Endettement net'; sign='− '; }
    else { cls='est-net-zero'; tag='Équilibre'; sign=''; }
    netEl.className = 'est-net ' + cls;
    netEl.innerHTML = `<span class="est-net-title">Trésorerie nette</span><span class="est-net-calc">${groupFr.format(state.treso)} € − ${groupFr.format(state.dette)} € = <b>${sign}${groupFr.format(Math.abs(net))} €</b></span><span class="est-net-tag">${tag}</span>`;
  }
  function updateGo(){
    const ok = !!(state.secteur && state.taille);
    goEl.disabled = !ok;
    goEl.classList.toggle('is-ready', ok);
    hintEl.textContent = ok ? 'Prêt — lancez l’estimation.' : 'Renseignez le secteur et la taille pour lancer l’estimation.';
  }
  // Suspense : mêmes messages que l'estimateur réel, 4 × STEP_MS = 2200ms (synchro barre CSS).
  const STEPS = ['Lecture de vos paramètres…', 'Application du multiple d’EBITDA sectoriel…', 'Ajustement selon votre secteur et votre taille…', 'Pont vers la valeur de vos titres (trésorerie nette)…'];
  const STEP_MS = 550;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timers = [];
  function clearTimers(){ timers.forEach(clearTimeout); timers = []; }
  function loadingHTML(){ return `<section class="demo-loading"><div class="demo-loading-card"><div class="demo-spin" aria-hidden="true"></div><div class="demo-msg">${STEPS[0]}</div><div class="demo-progress" aria-hidden="true"><span></span></div></div></section>`; }

  function openModal(){ modal.hidden = false; void modal.offsetWidth; modal.classList.add('is-open'); document.body.style.overflow = 'hidden'; closeBtn.focus(); }
  function closeModal(){ clearTimers(); modal.classList.remove('is-open'); document.body.style.overflow = ''; setTimeout(() => { modal.hidden = true; }, 260); }
  function run(){
    if (!state.secteur || !state.taille) return;
    clearTimers();
    if (reducedMotion){ stage.innerHTML = currentResultHTML(); openModal(); return; }
    stage.innerHTML = loadingHTML();
    openModal();
    const msgEl = stage.querySelector('.demo-msg');
    let i = 1;
    const tick = () => {
      if (i < STEPS.length){ if (msgEl) msgEl.textContent = STEPS[i]; i++; timers.push(setTimeout(tick, STEP_MS)); }
      else { stage.innerHTML = currentResultHTML(); }
    };
    timers.push(setTimeout(tick, STEP_MS));
  }

  secteurEl.addEventListener('change', () => { state.secteur = secteurEl.value; updateGo(); });
  tailleEls.forEach((el) => el.addEventListener('change', () => { if (el.checked){ state.taille = el.value; updateGo(); } }));
  ebitdaRangeEl.addEventListener('input', () => { state.ebitda = parseInt(ebitdaRangeEl.value, 10); ebitdaNumberEl.value = groupFr.format(state.ebitda); });
  ebitdaNumberEl.addEventListener('input', () => { state.ebitda = clamp(parseDigits(ebitdaNumberEl.value), 0, INPUT_MAX); ebitdaRangeEl.value = String(Math.min(state.ebitda, RANGE_MAX)); });
  ebitdaNumberEl.addEventListener('blur', () => { ebitdaNumberEl.value = groupFr.format(state.ebitda); });
  ebitdaNumberEl.addEventListener('focus', () => ebitdaNumberEl.select());
  tresoEl.addEventListener('input', () => { state.treso = clamp(parseDigits(tresoEl.value), 0, INPUT_MAX); updateNet(); });
  tresoEl.addEventListener('blur', () => { tresoEl.value = groupFr.format(state.treso); });
  tresoEl.addEventListener('focus', () => tresoEl.select());
  detteEl.addEventListener('input', () => { state.dette = clamp(parseDigits(detteEl.value), 0, INPUT_MAX); updateNet(); });
  detteEl.addEventListener('blur', () => { detteEl.value = groupFr.format(state.dette); });
  detteEl.addEventListener('focus', () => detteEl.select());
  goEl.addEventListener('click', run);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target.classList.contains('est-modal-backdrop')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
  styleBtns.forEach((b) => b.addEventListener('click', () => {
    activeStyle = parseInt(b.dataset.style, 10);
    document.querySelectorAll('.demo-style').forEach((x) => x.classList.toggle('is-active', parseInt(x.dataset.style, 10) === activeStyle));
    applyLayout();
    if (!modal.hidden && !stage.querySelector('.demo-loading')) stage.innerHTML = currentResultHTML();
  }));

  ebitdaNumberEl.value = groupFr.format(state.ebitda);
  ebitdaRangeEl.value = String(Math.min(state.ebitda, RANGE_MAX));
  tresoEl.value = groupFr.format(state.treso);
  detteEl.value = groupFr.format(state.dette);
  updateNet();
  updateGo();
  applyLayout();
  renderPanel();
})();
