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
});
