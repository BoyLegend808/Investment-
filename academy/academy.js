/**
 * Novara Capital - Financial Academy Logic
 * Course preview modal, track filtering, and progress tracking.
 */

document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.course-card');
  
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const title = card.querySelector('.course-title').textContent;
      alert(`Opening Course: "${title}"\nInteractive video player & curriculum notes loading...`);
    });
  });
});
