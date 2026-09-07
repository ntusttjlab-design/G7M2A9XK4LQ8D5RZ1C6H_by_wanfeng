(() => {
  const groups = document.querySelectorAll('[data-sponsor-marquee-group]');

  groups.forEach((group) => {
    const section = group.closest('.sponsor-space');
    const toggle = section?.querySelector('[data-sponsor-expand-toggle]');
    if (!toggle) return;

    group.querySelectorAll('.sponsor-track').forEach((track) => {
      const seen = new Set();

      track.querySelectorAll('.sponsor-slot').forEach((slot) => {
        const image = slot.querySelector('img');
        if (!image) return;

        const imagePath = image.getAttribute('src');
        if (seen.has(imagePath)) {
          slot.dataset.sponsorDuplicate = 'true';
          slot.setAttribute('aria-hidden', 'true');
          return;
        }

        seen.add(imagePath);
        const label = document.createElement('span');
        label.className = 'sponsor-logo-name';
        label.textContent = image.alt;
        slot.append(label);
      });
    });

    toggle.addEventListener('click', () => {
      const expanded = group.classList.toggle('is-expanded');
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.textContent = expanded ? toggle.dataset.collapseLabel : toggle.dataset.expandLabel;
    });
  });
})();
