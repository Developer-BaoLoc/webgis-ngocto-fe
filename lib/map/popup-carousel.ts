export function initMapPopupCarousel(root: ParentNode) {
  const carousel = root.querySelector<HTMLElement>("[data-popup-carousel]");
  if (!carousel) return;

  const trackEl = carousel.querySelector<HTMLElement>(".map-popup-track");
  const slides = carousel.querySelectorAll<HTMLElement>(".map-popup-slide");
  if (!trackEl || slides.length === 0) return;
  const track: HTMLElement = trackEl;

  if (slides.length === 1) {
    carousel
      .querySelectorAll(".map-popup-carousel-btn, .map-popup-dots")
      .forEach((node) => node.remove());
    return;
  }

  const dots = carousel.querySelectorAll<HTMLButtonElement>(".map-popup-dot");
  const prev = carousel.querySelector<HTMLButtonElement>(
    ".map-popup-carousel-btn--prev",
  );
  const next = carousel.querySelector<HTMLButtonElement>(
    ".map-popup-carousel-btn--next",
  );

  let index = 0;

  function update() {
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === index);
    });
  }

  prev?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    index = (index - 1 + slides.length) % slides.length;
    update();
  });

  next?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    index = (index + 1) % slides.length;
    update();
  });

  dots.forEach((dot) => {
    dot.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const dotIndex = Number(dot.dataset.index);
      if (!Number.isNaN(dotIndex)) {
        index = dotIndex;
        update();
      }
    });
  });
}
