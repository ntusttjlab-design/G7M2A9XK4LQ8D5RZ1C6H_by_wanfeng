(function () {
  document.querySelectorAll('[data-agenda-switch]').forEach(function (switcher) {
    const options = switcher.querySelectorAll('[data-agenda-mode]');
    const section = switcher.closest('.body-section') || document;
    const panels = section.querySelectorAll('[data-agenda-panel]');

    function setMode(mode) {
      switcher.dataset.mode = mode;
      options.forEach(function (option) {
        const active = option.dataset.agendaMode === mode;
        option.classList.toggle('is-active', active);
        option.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panels.forEach(function (panel) {
        panel.classList.toggle('is-hidden', panel.dataset.agendaPanel !== mode);
      });
    }

    options.forEach(function (option) {
      option.addEventListener('click', function () {
        setMode(option.dataset.agendaMode);
      });
    });
    setMode(switcher.dataset.mode || 'day1');
  });
})();
