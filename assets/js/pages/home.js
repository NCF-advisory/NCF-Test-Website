(() => {
  async function handleForm(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const btn = document.getElementById('f-submit');
    const error = document.getElementById('form-error');
    const originalHtml = btn?.innerHTML || '';

    if (error) {
      error.style.display = 'none';
      error.textContent = '';
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Envoi en cours...';
    }

    try {
      const data = Object.fromEntries(new FormData(form).entries());
      data.page_url = window.location.href;
      data.referrer = document.referrer;

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Form submission failed');

      const contactForm = document.getElementById('contact-form');
      const success = document.getElementById('form-success');
      if (contactForm) contactForm.style.display = 'none';
      if (success) success.style.display = 'block';
    } catch {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }

      if (error) {
        error.textContent = "L'envoi n'a pas abouti. Vous pouvez réessayer ou appeler le 06 67 10 46 98.";
        error.style.display = 'block';
      }
    }
  }

  window.handleForm = handleForm;

  const ready = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  };

  ready(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const heroEl = document.getElementById('hero');
    const heroMosaic = document.querySelector('.team-mosaic');
    const heroRapport = document.getElementById('hero-rapport');

    if (heroEl && heroRapport && !reducedMotion) {
      const rapportSolo = heroRapport.classList.contains('hero-rapport--solo');
      let scrollRaf = null;

      const updateHeroScroll = () => {
        const heroRect = heroEl.getBoundingClientRect();
        const heroHeight = heroEl.offsetHeight || window.innerHeight;
        const progress = Math.max(0, Math.min(1, -heroRect.top / heroHeight));

        if (rapportSolo) {
          const ty = 4 - progress * 12;
          heroRapport.style.transform = `translateY(${ty.toFixed(1)}px)`;
        } else {
          const rotation = -5 + progress * 5;
          const ty = 4 - progress * 18;
          const scale = 0.98 + progress * 0.04;
          heroRapport.style.transform =
            `perspective(1400px) rotate(${rotation.toFixed(2)}deg) translateY(${ty.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        }

        if (heroMosaic) {
          const py = -progress * 10;
          heroMosaic.style.transform = `translateY(${py.toFixed(1)}px)`;
        }

        scrollRaf = null;
      };

      const queueHeroUpdate = () => {
        if (!scrollRaf) scrollRaf = requestAnimationFrame(updateHeroScroll);
      };

      updateHeroScroll();
      window.addEventListener('scroll', queueHeroUpdate, { passive: true });
      window.addEventListener('resize', queueHeroUpdate, { passive: true });
    }
  });
})();
