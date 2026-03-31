(function () {
  "use strict";

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function initCountdown() {
    var root = document.getElementById("countdown");
    if (!root) return;
    var target = new Date("2026-10-02T09:00:00+08:00");

    var dEl = root.querySelector('[data-unit="days"]');
    var hEl = root.querySelector('[data-unit="hours"]');
    var mEl = root.querySelector('[data-unit="mins"]');
    var sEl = root.querySelector('[data-unit="secs"]');

    function tick() {
      var now = new Date();
      var diff = target - now;
      if (diff <= 0) {
        root.innerHTML =
          '<p class="countdown__done" style="margin:0;font-weight:700;">大會已開始，歡迎蒞臨！</p>';
        return;
      }
      var s = Math.floor(diff / 1000);
      var days = Math.floor(s / 86400);
      s %= 86400;
      var hours = Math.floor(s / 3600);
      s %= 3600;
      var mins = Math.floor(s / 60);
      var secs = s % 60;

      if (dEl && hEl && mEl && sEl) {
        dEl.textContent = days;
        hEl.textContent = pad(hours);
        mEl.textContent = pad(mins);
        sEl.textContent = pad(secs);
      } else {
        var units = root.querySelectorAll("[data-unit]");
        if (units.length >= 4) {
          units[0].textContent = days;
          units[1].textContent = pad(hours);
          units[2].textContent = pad(mins);
          units[3].textContent = pad(secs);
        }
      }
    }

    tick();
    setInterval(tick, 1000);
  }

  function initScheduleTabs() {
    var roots = document.querySelectorAll("[data-schedule-tabs]");
    roots.forEach(function (root) {
      var buttons = root.querySelectorAll("[data-tab]");
      var panels = root.querySelectorAll("[data-panel]");
      if (!buttons.length || !panels.length) return;

      function activate(id) {
        buttons.forEach(function (btn) {
          var tab = btn.getAttribute("data-tab");
          var isOn = tab === id;
          btn.classList.toggle("is-active", isOn);
          btn.setAttribute("aria-selected", isOn ? "true" : "false");
        });
        panels.forEach(function (panel) {
          var match = panel.getAttribute("data-panel") === id;
          panel.hidden = !match;
        });
      }

      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          activate(btn.getAttribute("data-tab"));
        });
      });

      var first = buttons[0].getAttribute("data-tab");
      activate(first);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initCountdown();
    initScheduleTabs();
  });
})();
