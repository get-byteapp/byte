/**
 * Main Entry Point
 * Initialize all modules and interactions
 */

import { initCarousel } from './carousel.js';
import {
  initMobileMenu,
  initBackToTop,
  initVideoAutoplay,
  initScrollReveal,
  initFAQ,
  initOSDetection,
  initHeroAnimation,
  initPreloader,
  initScrollToTop
} from './accessibility.js';

function initWaitlistForm() {
  const form = document.querySelector('.waitlist-form');
  const modal = document.getElementById('waitlistModal');
  const closeBtn = document.querySelector('.waitlist-modal-close');
  if (!form || !modal) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        btn.textContent = '✓ Sent';
        modal.classList.add('open');
      } else {
        btn.disabled = false;
        btn.textContent = 'Notify Me';
        const input = form.querySelector('input');
        if (input) input.setCustomValidity('Something went wrong — try again.');
        form.reportValidity();
      }
    } catch {
      btn.disabled = false;
      btn.textContent = 'Notify Me';
    }
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.remove('open');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all modules
  initPreloader();
  initScrollToTop();
  initOSDetection();
  initHeroAnimation();
  initMobileMenu();
  initBackToTop();
  initVideoAutoplay();
  initScrollReveal();
  initFAQ();
  initCarousel();
  initWaitlistForm();
});
