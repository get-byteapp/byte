/**
 * Accessibility & Interaction Module
 * Mobile menu, back-to-top button, etc.
 */

export function initMobileMenu() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  if (!mobileMenuBtn || !mobileMenu) return;

  mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
    });
  });
}

export function initBackToTop() {
  const backToTop = document.getElementById('backToTop');
  if (!backToTop) return;

  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

export function initVideoAutoplay() {
  const video = document.getElementById('howItWorksVideo');
  if (!video) return;

  const videoContainer = video.closest('.video-container');
  if (!videoContainer) return;

  const playVideo = () => {
    if (video.paused) {
      video.play().catch(() => {});
    }
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        playVideo();
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.3 });

  observer.observe(videoContainer);

  video.addEventListener('ended', () => {
    setTimeout(() => {
      video.currentTime = 0;
      video.play().catch(() => {});
    }, 1200);
  });
}

export function initScrollReveal() {
}

export function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const answer = item.querySelector('.faq-answer');
      const isOpen = item.classList.contains('open');

      // Close all others
      document.querySelectorAll('.faq-item.open').forEach(openItem => {
        if (openItem !== item) {
          openItem.classList.remove('open');
          openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
          openItem.querySelector('.faq-answer').style.maxHeight = '0';
        }
      });

      // Toggle current
      item.classList.toggle('open');
      btn.setAttribute('aria-expanded', !isOpen);

      if (!isOpen) {
        answer.style.maxHeight = answer.scrollHeight + 'px';
      } else {
        answer.style.maxHeight = '0';
      }
    });
  });
}

export function initOSDetection() {
  const ua = navigator.userAgent;
  const isMac = /Mac|iPhone|iPad/i.test(ua);
  const isWindows = /Win/i.test(ua);

  const macButtons = [
    document.getElementById('downloadMacBtn'),
    document.getElementById('downloadMacBtn2')
  ];
  const windowsButtons = [
    document.getElementById('downloadWindowsBtn'),
    document.getElementById('downloadWindowsBtn2')
  ];

  if (isWindows) {
    macButtons.forEach(btn => {
      if (btn) {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
      }
    });
    windowsButtons.forEach(btn => {
      if (btn) {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
      }
    });
  } else if (isMac) {
    windowsButtons.forEach(btn => {
      if (btn) btn.style.display = 'none';
    });
  }
}

export function initHeroAnimation() {
  setTimeout(() => {
    const heroContent = document.getElementById('heroContent');
    if (heroContent) {
      heroContent.classList.add('loaded');
    }
    const previewCard = document.getElementById('previewCard');
    if (previewCard) {
      previewCard.classList.add('visible');
    }
  }, 300);
}

export function initPreloader() {
  const preloader = document.querySelector('.preloader');
  if (!preloader) return;

  window.addEventListener('load', () => {
    preloader.classList.add('hidden');
  });

  // Also hide after a reasonable timeout
  setTimeout(() => {
    preloader.classList.add('hidden');
  }, 3000);
}

export function initScrollToTop() {
  window.addEventListener('load', () => {
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 10);
  });
}
