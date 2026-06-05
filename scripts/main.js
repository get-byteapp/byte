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
  const RATE_LIMIT_KEY = 'waitlist_last_submit';
  const RATE_LIMIT_MS = 5000;

  if (!form || !modal) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const now = Date.now();
    const lastSubmit = localStorage.getItem(RATE_LIMIT_KEY);

    if (lastSubmit && now - parseInt(lastSubmit) < RATE_LIMIT_MS) {
      const remaining = Math.ceil((RATE_LIMIT_MS - (now - parseInt(lastSubmit))) / 1000);
      btn.disabled = true;
      btn.textContent = `Wait ${remaining}s`;
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = 'Notify Me';
      }, RATE_LIMIT_MS - (now - parseInt(lastSubmit)));
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        localStorage.setItem(RATE_LIMIT_KEY, now.toString());
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
