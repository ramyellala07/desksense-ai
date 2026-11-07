/* ==========================================================================
   DeskSense AI — layout.js
   Injects the shared chrome on every page: header, pill navigation, demo
   badge, pause control, settings menu, mobile tab bar, "more" sheet, footer.
   Also owns the demo-wide pause state and the toast helper.
   ========================================================================== */
(function () {
  "use strict";

  var PAGE = document.body.getAttribute("data-page") || "";
  var MINIMAL = document.body.getAttribute("data-chrome") === "minimal";

  /* Flip to true when onboarding.html exists. Until then nobody is redirected. */
  var ONBOARDING_READY = false;

  var storage = {
    get: function (key) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    set: function (key, value) {
      try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
    }
  };

  /* First visit goes to onboarding (once the page is built). */
  if (ONBOARDING_READY && PAGE && PAGE !== "onboarding" && PAGE !== "style-guide" &&
      !storage.get("desksense.onboarded")) {
    window.location.replace("onboarding.html");
    return;
  }

  var paused = storage.get("desksense.paused") === "1";

  /* ------------------------------------------------------------- icons */
  var ICONS = {
    dashboard: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    trends: '<path d="M3 17l6-6 4 4 7-7"/><path d="M15 8h5v5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1.4"/><rect x="14" y="4" width="4" height="16" rx="1.4"/>',
    play: '<path d="M7 4.5l12 7.5-12 7.5z"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    chip: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    shield: '<path d="M12 3l7 3v5c0 4.6-3 7.7-7 9-4-1.3-7-4.4-7-9V6z"/><path d="M9.2 12.2l2 2 3.6-3.8"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.9 2c-.9.6-1.5 1.2-1.5 2.3"/><path d="M12 17.2h.01"/>',
    more: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'
  };

  function svg(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[name] || "") + "</svg>";
  }

  /* --------------------------------------------------------- page model */
  var MAIN_PAGES = [
    { id: "dashboard", href: "index.html", label: "Dashboard", icon: "dashboard" },
    { id: "recommendations", href: "recommendations.html", label: "Recommendations", icon: "sparkle" },
    { id: "trends", href: "trends.html", label: "Trends", icon: "trends" },
    { id: "sessions", href: "sessions.html", label: "Sessions", icon: "clock" },
    { id: "alerts", href: "alerts.html", label: "Alerts", icon: "bell" },
    { id: "modes", href: "modes.html", label: "Modes", icon: "sun" }
  ];

  var SETTINGS_LINKS = [
    { id: "preferences", href: "preferences.html", label: "Preferences", icon: "sliders" },
    { id: "devices", href: "devices.html", label: "Devices", icon: "chip" },
    { id: "privacy", href: "privacy.html", label: "Privacy & data", icon: "shield" },
    { id: "help", href: "help.html", label: "Help & about", icon: "help" }
  ];

  var MOBILE_TABS = [
    { id: "dashboard", href: "index.html", label: "Home", icon: "dashboard" },
    { id: "recommendations", href: "recommendations.html", label: "Tips", icon: "sparkle" },
    { id: "trends", href: "trends.html", label: "Trends", icon: "trends" },
    { id: "alerts", href: "alerts.html", label: "Alerts", icon: "bell" }
  ];

  function unreadCount() {
    try {
      return window.DeskSenseData.alerts.filter(function (a) { return a.status === "open"; }).length;
    } catch (e) { return 0; }
  }

  function isActive(id) { return PAGE === id; }

  function pillsHTML() {
    return '<div class="nav-pills">' + MAIN_PAGES.map(function (p) {
      return '<a href="' + p.href + '"' + (isActive(p.id) ? ' class="active" aria-current="page"' : "") + ">" + p.label + "</a>";
    }).join("") + "</div>";
  }

  function settingsMenuHTML() {
    return '<div class="menu-wrap">' +
      '<button class="icon-btn" type="button" data-menu-btn aria-haspopup="true" aria-expanded="false" aria-controls="ds-settings-menu" aria-label="Settings and more">' + svg("settings") + "</button>" +
      '<div class="menu" id="ds-settings-menu" role="menu" aria-label="Settings" hidden>' +
        '<p class="menu-label">Workspace</p>' +
        SETTINGS_LINKS.map(function (s) {
          return '<a href="' + s.href + '" role="menuitem"' + (isActive(s.id) ? ' aria-current="page"' : "") + ">" + svg(s.icon) + s.label + "</a>";
        }).join("") +
        '<div class="sep" role="separator"></div>' +
        '<button type="button" role="menuitem" data-action="feedback">' + svg("heart") + "Feedback check-in</button>" +
        '<a href="onboarding.html?reset=1" role="menuitem">' + svg("compass") + "Re-run workspace setup</a>" +
      "</div>" +
    "</div>";
  }

  function actionsHTML() {
    var unread = unreadCount();
    return '<div class="nav-actions">' +
      '<span class="demo-badge" role="status" aria-label="Demo data — every value on this site is simulated"><span class="badge-text">Demo data</span></span>' +
      '<button class="btn small pause-btn" type="button" data-pause-toggle aria-pressed="' + paused + '" aria-label="' + (paused ? "Resume monitoring" : "Pause monitoring") + '">' +
        svg(paused ? "play" : "pause") + '<span class="btn-label">' + (paused ? "Resume" : "Pause") + "</span>" +
      "</button>" +
      (!MINIMAL ? '<button class="btn ghost small checkin-btn" type="button" data-action="feedback" aria-label="Check in" title="Feedback check-in">' + svg("heart") + '<span class="btn-label">Check in</span></button>' : "") +
      '<a class="icon-btn" href="alerts.html" aria-label="Alerts' + (unread ? ", " + unread + " unread" : "") + '" title="Alerts">' + svg("bell") +
        (unread ? '<span class="ping" aria-hidden="true"></span>' : "") + "</a>" +
      settingsMenuHTML() +
    "</div>";
  }

  function headerHTML() {
    return '<header class="app-header">' +
      '<nav class="topnav" aria-label="Primary">' +
        '<a class="brand" href="index.html" aria-label="DeskSense AI — home">' +
          '<span class="brand-mark" aria-hidden="true"></span>' +
          '<span class="brand-name">DeskSense AI</span>' +
        "</a>" +
        (MINIMAL ? "" : pillsHTML()) +
        actionsHTML() +
      "</nav>" +
    "</header>";
  }

  function pauseBannerHTML() {
    return '<div class="pause-banner" role="status">' + svg("info") +
      "<span><strong>Monitoring paused.</strong> Sensor values and recommendations are frozen until you resume.</span>" +
      '<button class="btn ghost small" type="button" data-pause-toggle aria-pressed="true">Resume</button>' +
    "</div>";
  }

  function tabbarHTML() {
    return '<nav class="tabbar" aria-label="Mobile primary">' +
      MOBILE_TABS.map(function (t) {
        return '<a class="tab" href="' + t.href + '"' + (isActive(t.id) ? ' aria-current="page"' : "") + ">" +
          svg(t.icon) + "<span>" + t.label + "</span></a>";
      }).join("") +
      '<button class="tab" type="button" data-open-more aria-haspopup="dialog" aria-controls="ds-more-sheet">' +
        svg("more") + "<span>More</span>" +
      "</button>" +
    "</nav>";
  }

  function moreSheetHTML() {
    var links = [
      { id: "sessions", href: "sessions.html", label: "Sessions", icon: "clock" },
      { id: "modes", href: "modes.html", label: "Modes", icon: "sun" },
      { id: "preferences", href: "preferences.html", label: "Preferences", icon: "sliders" },
      { id: "devices", href: "devices.html", label: "Devices", icon: "chip" },
      { id: "privacy", href: "privacy.html", label: "Privacy & data", icon: "shield" },
      { id: "help", href: "help.html", label: "Help & about", icon: "help" }
    ];
    return '<div class="sheet-backdrop" data-sheet-backdrop hidden></div>' +
      '<section class="sheet" id="ds-more-sheet" role="dialog" aria-modal="true" aria-labelledby="ds-more-title" aria-hidden="true">' +
        '<div class="sheet-handle" aria-hidden="true"></div>' +
        '<div class="sheet-head">' +
          '<h2 id="ds-more-title">More</h2>' +
          '<button class="icon-btn close-btn" type="button" data-close-sheet aria-label="Close menu">' + svg("close") + "</button>" +
        "</div>" +
        '<div class="sheet-links">' +
          links.map(function (l) {
            return '<a href="' + l.href + '">' + svg(l.icon) + "<span>" + l.label + "</span></a>";
          }).join("") +
        "</div>" +
        '<div class="stack-sm" style="margin-top:14px">' +
          '<button class="btn ghost" type="button" data-action="feedback" style="width:100%">' + svg("heart") + "Feedback check-in</button>" +
          '<a class="btn ghost" href="onboarding.html?reset=1" style="width:100%;text-decoration:none;justify-content:center">' + svg("compass") + "Re-run setup</a>" +
        "</div>" +
      "</section>";
  }

  function footerHTML() {
    return '<footer class="app-footer">' +
      "<div>DeskSense AI · Demo build with simulated sensor data. No camera. No emotion detection. " +
        "Comfort suggestions only — not medical advice.</div>" +
      '<nav class="footer-links" aria-label="Secondary">' +
        '<a href="help.html">Help</a>' +
        '<a href="privacy.html">Privacy</a>' +
        '<a href="onboarding.html">Onboarding</a>' +
        '<a href="style-guide.html">Style guide</a>' +
      "</nav>" +
    "</footer>";
  }

  /* --------------------------------------------------------------- mount */
  var main = document.querySelector("main");
  if (main) {
    if (!main.id) main.id = "main";
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
  }

  var chrome = '<a class="skip-link" href="#main">Skip to content</a>' +
    headerHTML() + pauseBannerHTML() +
    (MINIMAL ? "" : tabbarHTML());

  document.body.insertAdjacentHTML("afterbegin", chrome);
  if (!MINIMAL) document.body.insertAdjacentHTML("beforeend", footerHTML());
  document.body.insertAdjacentHTML("beforeend", moreSheetHTML());

  document.body.classList.toggle("is-paused", paused);

  /* --------------------------------------------------------------- toast */
  function toast(html) {
    var wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      wrap.setAttribute("aria-live", "polite");
      document.body.appendChild(wrap);
    }
    var item = document.createElement("div");
    item.className = "toast";
    item.innerHTML = html;
    wrap.appendChild(item);
    window.setTimeout(function () {
      if (item.parentNode) item.parentNode.removeChild(item);
      if (wrap && !wrap.children.length) wrap.remove();
    }, 3600);
  }

  /* -------------------------------------------------------------- pause */
  function setPaused(next, announce) {
    paused = !!next;
    storage.set("desksense.paused", paused ? "1" : "0");
    document.body.classList.toggle("is-paused", paused);

    var buttons = document.querySelectorAll(".pause-btn");
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      btn.setAttribute("aria-pressed", String(paused));
      btn.setAttribute("aria-label", paused ? "Resume monitoring" : "Pause monitoring");
      btn.innerHTML = svg(paused ? "play" : "pause") +
        '<span class="btn-label">' + (paused ? "Resume" : "Pause") + "</span>";
    }

    document.querySelectorAll(".pause-banner [data-pause-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(paused));
    });

    if (announce) {
      toast(paused
        ? "<strong>Monitoring paused.</strong> Values will resume from the same mock state."
        : "<strong>Monitoring resumed.</strong> Recommendations are live again.");
    }
    window.dispatchEvent(new CustomEvent("desksense:pausechange", { detail: { paused: paused } }));
  }

  /* ---------------------------------------------------------- feedback */
  function openFeedback() {
    if (window.DeskSenseFeedback && typeof window.DeskSenseFeedback.open === "function") {
      window.DeskSenseFeedback.open();
      return;
    }
    window.dispatchEvent(new CustomEvent("desksense:feedback"));
    toast("<strong>Feedback check-in</strong> is added in the final build step.");
  }

  /* --------------------------------------------------------------- menu */
  var menuBtn = document.querySelector("[data-menu-btn]");
  var menu = document.getElementById("ds-settings-menu");

  function closeMenu(returnFocus) {
    if (!menu || !menuBtn || menu.hidden) return;
    menu.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
    if (returnFocus) menuBtn.focus();
  }

  if (menuBtn && menu) {
    menuBtn.addEventListener("click", function () {
      var willOpen = menu.hidden;
      menu.hidden = !willOpen;
      menuBtn.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) {
        var first = menu.querySelector("a, button");
        if (first) first.focus();
      }
    });
  }

  /* --------------------------------------------------------------- sheet */
  var sheet = document.getElementById("ds-more-sheet");
  var backdrop = document.querySelector("[data-sheet-backdrop]");
  var sheetTrigger = null;

  function openSheet(trigger) {
    if (!sheet || !backdrop) return;
    sheetTrigger = trigger || document.activeElement;
    backdrop.hidden = false;
    // let display apply before the transition starts, then move focus in
    window.requestAnimationFrame(function () {
      backdrop.classList.add("open");
      sheet.classList.add("open");
      var closer = sheet.querySelector("[data-close-sheet]");
      if (closer) closer.focus();
    });
    sheet.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeSheet() {
    if (!sheet || !backdrop || !sheet.classList.contains("open")) return;
    sheet.classList.remove("open");
    backdrop.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    window.setTimeout(function () { backdrop.hidden = true; }, 260);
    if (sheetTrigger && sheetTrigger.focus) sheetTrigger.focus();
  }

  function openMoreSheet(trigger) {
    openSheet(trigger);
  }

  if (backdrop) {
    backdrop.addEventListener("click", closeSheet);
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    var pauseBtn = target.closest("[data-pause-toggle]");
    if (pauseBtn) {
      event.preventDefault();
      setPaused(!paused, true);
      return;
    }

    var feedbackBtn = target.closest('[data-action="feedback"]');
    if (feedbackBtn) {
      event.preventDefault();
      closeMenu(false);
      closeSheetSoon();
      openFeedback();
      return;
    }

    var moreBtn = target.closest("[data-open-more]");
    if (moreBtn) {
      event.preventDefault();
      openMoreSheet(moreBtn);
      return;
    }

    var closer = target.closest("[data-close-sheet]");
    if (closer) {
      event.preventDefault();
      closeSheet();
      return;
    }

    if (menu && menuBtn && !menu.hidden &&
        !menu.contains(target) && !menuBtn.contains(target)) {
      closeMenu(false);
    }
  });

  // Close the sheet without restoring focus (used when opening feedback over it).
  function closeSheetSoon() {
    if (!sheet || !sheet.classList.contains("open")) return;
    sheet.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    window.setTimeout(function () { if (backdrop) backdrop.hidden = true; }, 260);
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeMenu(true);
      closeSheet();
    }
    if (event.key === "Tab" && sheet && sheet.classList.contains("open")) {
      var focusables = sheet.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  /* --------------------------------------------------------- public API */
  window.DeskSenseLayout = {
    toast: toast,
    openFeedback: openFeedback,
    setPaused: setPaused,
    get paused() { return paused; }
  };
})();
