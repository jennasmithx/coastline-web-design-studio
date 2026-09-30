// Coastline Web Design: scroll reveals, navbar state, progress bar, card spotlight, stat count-up
(function () {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── Scroll progress bar + navbar state ───
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.prepend(progress);
  const nav = document.querySelector('.navbar');

  let ticking = false;
  function onScroll() {
    const max = root.scrollHeight - window.innerHeight;
    progress.style.setProperty('--progress', max > 0 ? Math.min(window.scrollY / max, 1) : 0);
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 24);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // ─── Reveal on scroll ───
  const singles = [
    '.label', '.section-title', '.divider', '.page-hero p', '.about-strip-text p', '.about-strip-text .btn',
    '.story-text > *', '.story-image', '.testimonial-inner > *', '.cta-band-inner', '.services-grid',
    '.values-grid', '.stats', '.process-step', '.order-box', '.order-summary', '.footer-inner'
  ];
  const staggered = ['.pricing-grid', '.projects-grid', '.product-grid', '.service-detail-grid', '.team-grid'];

  const targets = new Set();
  document.querySelectorAll(singles.join(',')).forEach(function (el) { targets.add(el); });
  document.querySelectorAll(staggered.join(',')).forEach(function (grid) {
    Array.from(grid.children).forEach(function (child, i) {
      child.style.setProperty('--d', (i % 3) * 0.1 + 's');
      targets.add(child);
    });
  });

  const revealEls = [];
  targets.forEach(function (el) {
    if (el.closest('.hero') && !el.classList.contains('fade-up')) return;
    // Elements that already use the fade-up animation wait until they're on screen
    if (!el.classList.contains('fade-up')) el.classList.add('reveal');
    revealEls.push(el);
  });
  document.querySelectorAll('.fade-up').forEach(function (el) {
    if (!targets.has(el)) revealEls.push(el);
  });

  function show(el) {
    el.classList.add('in-view');
    if (el.classList.contains('reveal')) {
      // Hand transitions back to the element's own hover styles once revealed
      const delay = parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0;
      setTimeout(function () { el.classList.remove('reveal'); }, 900 + delay * 1000);
    }
  }

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(show);
  } else {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { show(entry.target); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });

    // Safety net: anything left once the bottom of the page is reached gets shown
    window.addEventListener('scroll', function atBottom() {
      if (window.innerHeight + window.scrollY >= root.scrollHeight - 4) {
        revealEls.forEach(function (el) { if (!el.classList.contains('in-view')) show(el); });
        window.removeEventListener('scroll', atBottom);
      }
    }, { passive: true });
  }

  // ─── Cursor spotlight on cards (mouse/trackpad only) ───
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.service-item, .price-card, .glass-card, .product-card, .value-item, .stat, .process-step')
      .forEach(function (card) {
        card.classList.add('spotlight');
        card.addEventListener('pointermove', function (e) {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          card.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
      });
  }

  // ─── Count-up stats (e.g. 100%, 14d, 5★) ───
  const stats = document.querySelectorAll('.stat-num');
  if (stats.length && !reduceMotion && 'IntersectionObserver' in window) {
    const statIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        statIo.unobserve(entry.target);
        const el = entry.target;
        const match = el.textContent.trim().match(/^(\d+)([^\d:]*)$/);
        if (!match) return;
        const end = parseInt(match[1], 10), suffix = match[2];
        const start = performance.now(), duration = 1400;
        (function frame(now) {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = Math.round(end * eased) + suffix;
          if (t < 1) requestAnimationFrame(frame);
        })(start);
      });
    }, { threshold: 0.6 });
    stats.forEach(function (el) { statIo.observe(el); });
  }
})();
