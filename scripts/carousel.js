/**
 * Feature Carousel Module
 */

export function initCarousel() {
  const carouselData = [
    { label: 'No Subscription', title: 'Forever Credits', desc: 'Your credits never expire. Buy once, use forever.' },
    { label: 'Unified Interface', title: 'Use Any Model', desc: 'GPT-4, Claude 3.5, Gemini Pro, Mistral — one beautiful interface.' },
    { label: 'Save Money', title: 'Direct API Pricing', desc: 'Pay directly with your API key. No middleman markup.' },
    { label: 'Customize', title: '10+ Themes', desc: 'Dark, light, ocean, sage, warm, midnight and more.' },
    { label: 'Smart', title: 'Memory Built-in', desc: 'Byte remembers context. No need to repeat yourself.' },
    { label: 'Power User', title: 'Council Mode', desc: 'Chat with multiple AIs at once. Compare responses.' }
  ];

  let currentSlide = 0;
  let autoPlayInterval;
  const SLIDE_DURATION = 4000;

  const carouselContainer = document.querySelector('.feature-carousel');
  if (!carouselContainer) return;

  const slides = document.querySelectorAll('.feature-carousel-slide');
  const dots = document.querySelectorAll('.carousel-dot');
  const prevBtn = document.querySelector('.carousel-prev');
  const nextBtn = document.querySelector('.carousel-next');
  const content = document.querySelector('.feature-carousel-content');

  if (!slides.length || !content) return;

  const labelEl = content.querySelector('.feature-carousel-label');
  const titleEl = content.querySelector('.feature-carousel-title');
  const descEl = content.querySelector('.feature-carousel-desc');

  function goToSlide(index) {
    currentSlide = (index + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === currentSlide);
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });

    content.classList.remove('visible');
    setTimeout(() => {
      const data = carouselData[currentSlide];
      labelEl.textContent = data.label;
      titleEl.textContent = data.title;
      descEl.textContent = data.desc;
      content.classList.add('visible');
    }, 150);
  }

  function nextSlide() {
    goToSlide(currentSlide + 1);
  }

  function prevSlide() {
    goToSlide(currentSlide - 1);
  }

  function startAutoPlay() {
    stopAutoPlay();
    autoPlayInterval = setInterval(nextSlide, SLIDE_DURATION);
  }

  function stopAutoPlay() {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
    }
  }

  if (prevBtn) prevBtn.addEventListener('click', () => {
    prevSlide();
    startAutoPlay();
  });

  if (nextBtn) nextBtn.addEventListener('click', () => {
    nextSlide();
    startAutoPlay();
  });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      goToSlide(i);
      startAutoPlay();
    });
  });

  carouselContainer.addEventListener('mouseenter', stopAutoPlay);
  carouselContainer.addEventListener('mouseleave', startAutoPlay);

  // Initialize
  setTimeout(() => {
    content.classList.add('visible');
  }, 300);
  startAutoPlay();
}
