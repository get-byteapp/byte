/**
 * Feature Carousel Module
 */

export function initCarousel() {
  const carouselData = [
    { label: 'Featured', title: '16 Providers', desc: 'OpenAI, Claude, Gemini, Mistral, Groq, HuggingFace, Together AI, and more.' },
    { label: 'Personalization', title: '9 Themes', desc: 'Dark, Light, Ocean, Sage, Rose, Sand, Slate, Midnight, Warm.' },
    { label: 'Save Money', title: 'Direct API Pricing', desc: 'Pay directly with your API key. No middleman markup.' },
    { label: 'Real-time', title: 'Web Search', desc: 'Search the internet and get current information instantly.' },
    { label: 'Powerful', title: 'Vision & Files', desc: 'Upload images, PDFs, documents and get instant analysis.' },
    { label: 'Flexible', title: 'Local Support', desc: 'Run Ollama and LM Studio models on your own machine.' }
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
