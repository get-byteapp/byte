/**
 * Carousel Module - handles both feature and models carousels
 */

function initGenericCarousel(containerSelector, slideSelector, dotSelector, hasContent = false, contentData = []) {
  let currentSlide = 0;
  let autoPlayInterval;
  const SLIDE_DURATION = 4000;

  const carouselContainer = document.querySelector(containerSelector);
  if (!carouselContainer) return;

  const slides = carouselContainer.querySelectorAll(slideSelector);
  const dots = carouselContainer.querySelectorAll(dotSelector);
  const prevBtn = carouselContainer.querySelector('.carousel-prev');
  const nextBtn = carouselContainer.querySelector('.carousel-next');
  const content = hasContent ? carouselContainer.querySelector('[class$="-content"]') : null;

  if (!slides.length) return;

  const labelEl = content?.querySelector('[class$="-label"]');
  const titleEl = content?.querySelector('[class$="-title"]');
  const descEl = content?.querySelector('[class$="-desc"]');

  function goToSlide(index) {
    currentSlide = (index + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      if (i === currentSlide) {
        slide.classList.remove('active');
        void slide.offsetWidth;
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });

    if (content && contentData.length) {
      content.classList.remove('visible');
      setTimeout(() => {
        const data = contentData[currentSlide];
        if (labelEl) labelEl.textContent = data.label;
        if (titleEl) titleEl.textContent = data.title;
        if (descEl) descEl.textContent = data.desc;
        content.classList.add('visible');
      }, 150);
    }
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
  if (content) {
    setTimeout(() => {
      content.classList.add('visible');
    }, 300);
  }
  startAutoPlay();
}

export function initCarousel() {
  // Feature carousel with content data
  const featureCarouselData = [
    { label: 'Providers', title: '16 Providers', desc: 'OpenAI, Claude, Gemini, Mistral, Groq, HuggingFace, Together AI, and more.' },
    { label: 'Personalization', title: 'Super Customizable', desc: 'Themes, fonts, layouts, and more — make Byte yours.' },
    { label: 'Real-time', title: 'Web Search', desc: 'Search the internet and get current information instantly.' },
    { label: 'Powerful', title: 'Vision & Files', desc: 'Upload images, PDFs, documents and get instant analysis.' },
  ];

  initGenericCarousel('.feature-carousel', '.feature-carousel-slide', '.feature-carousel .carousel-dot', true, featureCarouselData);

  // Models carousel (no content data needed)
  initGenericCarousel('.models-carousel', '.models-carousel-slide', '.models-carousel .carousel-dot', false);
}
