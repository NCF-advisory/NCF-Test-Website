// ═══════════════════════════════════════════════════════════
// Page transmission — fil conducteur en escalier.
//
// Variante locale du composant fil directeur (thread.js) avec un
// mapping LINÉAIRE entre la progression de scroll dans la piste et
// la longueur de path dessinée. Indispensable ici parce que le tracé
// est un staircase (segments verticaux et horizontaux) : le mapping
// "y-de-viewport → longueur" de thread.js ferait apparaître chaque
// segment horizontal d'un coup quand le front le croise.
//
// Logique de spawn des nœuds identique à thread.js : pour chaque
// nœud, on précalcule la longueur de path la plus proche de l'ancre,
// et on déclenche `.is-spawned` quand drawnLength la franchit.
// ═══════════════════════════════════════════════════════════
(function () {
  function num(v, fallback) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function init() {
    const section = document.getElementById('parcours');
    const path = document.getElementById('thread-path');
    const track = document.querySelector('.parcours-track');
    if (!section || !path || !track) return;
    if (window.matchMedia && window.matchMedia('(max-width: 820px)').matches) return;

    const front = num(section.dataset.threadFront, 0.78);
    const cardDelay = num(section.dataset.threadCardDelay, 180);
    const sampleStep = 4;

    const pathLength = path.getTotalLength();
    if (!pathLength) return;

    const revealLines = Array.from(track.querySelectorAll('.thread-line'));
    for (let i = 0; i < revealLines.length; i++) {
      revealLines[i].style.strokeDasharray = pathLength;
      revealLines[i].style.strokeDashoffset = pathLength;
    }

    // Échantillons (length → x,y) pour retrouver la longueur la plus proche
    // d'une ancre nœud.
    const samples = [];
    for (let len = 0; len <= pathLength; len += sampleStep) {
      const pt = path.getPointAtLength(len);
      samples.push({ len: len, x: pt.x, y: pt.y });
    }
    if (samples[samples.length - 1].len < pathLength) {
      const pt = path.getPointAtLength(pathLength);
      samples.push({ len: pathLength, x: pt.x, y: pt.y });
    }

    const nodes = [];
    document.querySelectorAll('.node-group').forEach((g) => {
      nodes.push({
        element: g,
        card: null,
        x: parseFloat(g.dataset.anchorX),
        y: parseFloat(g.dataset.anchorY),
        thresholdLength: 0,
        thresholdDist: Infinity,
        spawned: false,
      });
    });
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      for (let j = 0; j < nodes.length; j++) {
        const n = nodes[j];
        const d = Math.hypot(s.x - n.x, s.y - n.y);
        if (d < n.thresholdDist) {
          n.thresholdDist = d;
          n.thresholdLength = s.len;
        }
      }
    }
    for (let i = 0; i < nodes.length; i++) {
      const step = nodes[i].element.dataset.step;
      if (step != null) {
        nodes[i].card = document.querySelector('[data-card-step="' + step + '"]');
      }
    }

    const metrics = {
      trackTop: 0,
      trackHeight: 1,
      viewportHeight: window.innerHeight,
    };

    function readScrollY() {
      return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    }

    function refreshMetrics() {
      const r = track.getBoundingClientRect();
      metrics.trackTop = r.top + readScrollY();
      metrics.trackHeight = r.height || 1;
      metrics.viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    }

    function getDrawnLength() {
      const yInTrack = (readScrollY() + (metrics.viewportHeight * front)) - metrics.trackTop;
      const progress = yInTrack / metrics.trackHeight;
      if (progress <= 0) return 0;
      if (progress >= 1) return pathLength;
      return progress * pathLength;
    }

    let lastDrawnLength = -1;
    function update() {
      const drawnLength = getDrawnLength();
      if (Math.abs(drawnLength - lastDrawnLength) < 0.35) return;
      lastDrawnLength = drawnLength;
      const dashOffset = pathLength - drawnLength;
      for (let i = 0; i < revealLines.length; i++) {
        revealLines[i].style.strokeDashoffset = dashOffset;
      }
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!n.spawned && drawnLength >= n.thresholdLength) {
          n.element.classList.add('is-spawned');
          n.spawned = true;
          if (n.card) {
            setTimeout(function () { n.card.classList.add('is-revealed'); }, cardDelay);
          }
        }
      }
    }

    let ticking = false;
    let inView = true;
    function onScroll() {
      if (!inView || ticking) return;
      requestAnimationFrame(function () {
        update();
        ticking = false;
      });
      ticking = true;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () {
      refreshMetrics();
      lastDrawnLength = -1;
      update();
    }, { passive: true });
    window.addEventListener('load', function () {
      refreshMetrics();
      lastDrawnLength = -1;
      update();
    }, { once: true });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        function (entries) {
          for (let i = 0; i < entries.length; i++) {
            inView = entries[i].isIntersecting;
            if (inView) update();
          }
        },
        { rootMargin: '200px 0px 200px 0px', threshold: 0 }
      );
      io.observe(section);
    }

    refreshMetrics();
    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
