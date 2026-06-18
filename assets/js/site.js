(() => {
  const ready = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  };

  ready(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const navbar = document.getElementById('navbar');
    if (navbar) {
      const updateNavbar = () => navbar.classList.toggle('scrolled', window.scrollY > 40);
      updateNavbar();
      window.addEventListener('scroll', updateNavbar, { passive: true });
    }

    let navOpen = false;
    const hbg = document.getElementById('hbg');
    const mob = document.getElementById('mob-menu');
    const bars = ['b1', 'b2', 'b3'].map((id) => document.getElementById(id));

    const setNavOpen = (open) => {
      navOpen = open;
      mob?.classList.toggle('open', navOpen);
      hbg?.setAttribute('aria-expanded', String(navOpen));

      if (bars[0]) bars[0].style.transform = navOpen ? 'translateY(6.5px) rotate(45deg)' : '';
      if (bars[1]) bars[1].style.opacity = navOpen ? '0' : '';
      if (bars[2]) bars[2].style.transform = navOpen ? 'translateY(-6.5px) rotate(-45deg)' : '';
    };

    window.closeNav = () => setNavOpen(false);

    hbg?.addEventListener('click', () => setNavOpen(!navOpen));
    mob?.querySelectorAll('a').forEach((link) => link.addEventListener('click', window.closeNav));

    if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

      document.querySelectorAll('.rv').forEach((el) => revealObserver.observe(el));
    } else {
      document.querySelectorAll('.rv').forEach((el) => el.classList.add('in'));
    }

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (event) => {
        const href = anchor.getAttribute('href');
        if (!href || href === '#') return;

        const target = document.querySelector(href);
        if (!target) return;

        event.preventDefault();
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.pageYOffset - 118,
          behavior: 'smooth',
        });
      });
    });

    if (!reducedMotion && window.matchMedia('(hover: hover) and (min-width: 981px)').matches) {
      document.querySelectorAll('.btn-magnetic').forEach((btn) => {
        const content = btn.querySelector('.btn-content') || btn;
        let rect = null;

        // Position mesurée au repos, pour éviter que le déplacement du bouton
        // ne réalimente le calcul (sinon : oscillation).
        btn.addEventListener('pointerenter', () => {
          rect = btn.getBoundingClientRect();
        });

        btn.addEventListener('pointermove', (event) => {
          if (!rect) rect = btn.getBoundingClientRect();
          const x = event.clientX - rect.left - rect.width / 2;
          const y = event.clientY - rect.top - rect.height / 2;
          btn.style.transform = `translate(${(x * 0.075).toFixed(1)}px, ${(y * 0.06).toFixed(1)}px)`;
          if (content !== btn) {
            content.style.transform = `translate(${(x * 0.03).toFixed(1)}px, ${(y * 0.025).toFixed(1)}px)`;
          }
        });

        btn.addEventListener('pointerleave', () => {
          rect = null;
          btn.style.transform = '';
          if (content !== btn) content.style.transform = '';
        });
      });
    }
  });
})();
