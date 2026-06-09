/* AUTOCYCLE — composant « Pourquoi nous » (onglets auto-cyclés). Voir /assets/css/components/autocycle.css */
    (function () {
      "use strict";

      var root   = document.getElementById("tabs");
      if (!root) { return; }
      var fill   = document.getElementById("fill");
      var tabs   = Array.prototype.slice.call(root.querySelectorAll(".tab"));
      var panels = Array.prototype.slice.call(root.querySelectorAll(".panel"));
      var dots   = Array.prototype.slice.call(root.querySelectorAll(".dot"));
      var stateNum = document.getElementById("state-num");
      var count  = panels.length;

      var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Durée d'un cycle, lue depuis le token CSS --cycle (ms).
      var cycleMs = parseFloat(getComputedStyle(root).getPropertyValue("--cycle")) || 4500;

      var index   = 0;
      var timer   = null;
      var paused  = false;
      var inView  = false;

      function pad(n) { return (n + 1 < 10 ? "0" : "") + (n + 1); }

      // Positionne (sans animer le remplissage) le remplisseur sous l'onglet i.
      function placeFill(i) {
        fill.style.left = (i * (100 / count)) + "%";
      }

      // Lance/relance l'animation de remplissage du cycle courant.
      function runFill() {
        // reset : on retire la classe, force un reflow, puis on relance.
        root.classList.remove("is-running");
        root.classList.remove("is-paused");
        void fill.offsetWidth;   // reflow → repart de scaleX(0)
        placeFill(index);
        root.classList.add("is-running");
      }

      function activate(i, opts) {
        opts = opts || {};
        index = (i + count) % count;

        panels.forEach(function (p, k) {
          var on = k === index;
          p.classList.toggle("is-active", on);
          if (on) { p.removeAttribute("hidden"); }
          else { p.setAttribute("hidden", ""); }
        });
        tabs.forEach(function (t, k) {
          t.setAttribute("aria-selected", k === index ? "true" : "false");
        });
        dots.forEach(function (d, k) {
          d.setAttribute("aria-current", k === index ? "true" : "false");
        });
        stateNum.textContent = pad(index);

        if (!reduced && !opts.silent) {
          runFill();
        } else {
          placeFill(index);
        }
      }

      function next() { activate(index + 1); }

      function start() {
        if (reduced || paused || !inView) { return; }
        stop();
        runFill();
        timer = setInterval(next, cycleMs);
      }

      function stop() {
        if (timer) { clearInterval(timer); timer = null; }
      }

      function pause() {
        if (reduced) { return; }
        paused = true;
        stop();
        // Fige le remplissage à sa position actuelle.
        var w = fill.getBoundingClientRect().width;
        var trackW = fill.parentElement.getBoundingClientRect().width;
        var ratio = trackW ? Math.min(w / (trackW / count), 1) : 0;
        root.classList.add("is-paused");
        root.classList.remove("is-running");
        fill.style.transform = "scaleX(" + ratio + ")";
      }

      function resume() {
        if (reduced) { return; }
        paused = false;
        fill.style.transform = "";   // rend la main au CSS
        root.classList.remove("is-paused");
        start();
      }

      // Saut manuel (clic onglet / dot / clavier) : active + reset timer.
      function jump(i) {
        var wasAuto = !paused && inView && !reduced;
        stop();
        fill.style.transform = "";
        activate(i);
        if (wasAuto) {
          timer = setInterval(next, cycleMs);
        }
      }

      // ── Événements ──
      tabs.forEach(function (t, i) {
        t.addEventListener("click", function () { jump(i); });
        t.addEventListener("keydown", function (e) {
          var k = e.key;
          if (k === "ArrowRight" || k === "ArrowDown") {
            e.preventDefault();
            var n = (i + 1) % count;
            tabs[n].focus(); jump(n);
          } else if (k === "ArrowLeft" || k === "ArrowUp") {
            e.preventDefault();
            var p = (i - 1 + count) % count;
            tabs[p].focus(); jump(p);
          } else if (k === "Home") {
            e.preventDefault(); tabs[0].focus(); jump(0);
          } else if (k === "End") {
            e.preventDefault(); tabs[count - 1].focus(); jump(count - 1);
          }
        });
      });
      dots.forEach(function (d, i) {
        d.addEventListener("click", function () { jump(i); });
      });

      // Pause au survol / focus à l'intérieur.
      root.addEventListener("mouseenter", pause);
      root.addEventListener("mouseleave", resume);
      root.addEventListener("focusin", pause);
      root.addEventListener("focusout", function (e) {
        if (!root.contains(e.relatedTarget)) { resume(); }
      });

      // N'anime que lorsque visible (perf + sens : le cycle démarre à l'entrée).
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            inView = en.isIntersecting;
            if (inView) { start(); }
            else { stop(); }
          });
        }, { threshold: 0.4 });
        io.observe(root);
      } else {
        inView = true;
        start();
      }

      // État initial.
      activate(0, { silent: true });
      placeFill(0);
      // En mode autoplay, start() est déclenché par l'IntersectionObserver.
      // En reduced motion, tout est révélé via CSS et le 1er reste actif.
    })();
  
