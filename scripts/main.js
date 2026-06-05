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
  if (!form) return;

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
        form.innerHTML = `
          <p style="color: var(--color-text); font-size: var(--text-lg); font-weight: var(--font-weight-semibold);">You're on the list.</p>
          <p style="color: var(--color-text-secondary); margin-top: var(--space-2); font-size: var(--text-sm);">We'll email you the moment Byte launches.</p>
        `;
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
