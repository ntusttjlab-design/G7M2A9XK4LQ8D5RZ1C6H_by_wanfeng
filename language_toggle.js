(function () {
  const nav = document.querySelector('.site-nav');
  if (nav) {
    const indicator = document.createElement('span');
    indicator.className = 'site-nav__indicator';
    indicator.setAttribute('aria-hidden', 'true');
    nav.insertBefore(indicator, nav.firstChild);

    let frameId = 0;
    function moveIndicator(link) {
      if (!link) return;
      indicator.style.width = link.offsetWidth + 'px';
      indicator.style.transform = 'translateX(' + link.offsetLeft + 'px)';
    }

    function syncIndicator() {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(function () {
        const current = nav.querySelector('a.is-current') || nav.querySelector('a');
        moveIndicator(current);
        nav.classList.add('has-indicator');
      });
    }

    nav.addEventListener('pointerover', function (event) {
      const link = event.target.closest('a');
      if (!link || !nav.contains(link)) return;
      moveIndicator(link);
    });

    nav.addEventListener('pointerleave', syncIndicator);
    nav.addEventListener('scroll', syncIndicator, { passive: true });
    window.addEventListener('resize', syncIndicator);
    window.addEventListener('load', syncIndicator);
    syncIndicator();
  }

  const toggle = document.querySelector('[data-language-toggle]');
  if (!toggle) return;

  toggle.addEventListener('click', function (event) {
    event.preventDefault();
    const target = toggle.getAttribute('href');
    if (!target) return;
    toggle.setAttribute('aria-busy', 'true');
    window.setTimeout(function () {
      window.location.href = target;
    }, 120);
  });
})();
