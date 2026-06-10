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
})();
