/* Filtres par thématique de la page Publications */
document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.pub-filter');
  const cards = document.querySelectorAll('.pub-card');
  if (!buttons.length || !cards.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      buttons.forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      cards.forEach((card) => {
        card.hidden = filter !== 'all' && card.dataset.theme !== filter;
      });
    });
  });
});
