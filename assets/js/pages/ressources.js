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
        // Le reveal de site.js cesse d'observer les éléments déjà passés :
        // on force l'état visible pour les cartes réaffichées par un filtre.
        card.classList.add('in');
        card.hidden = filter !== 'all' && card.dataset.theme !== filter;
      });
    });
  });
});
