/* ============================================================
   doc-runtime.js — minimal document/social chrome
   ------------------------------------------------------------
   Print-media artifacts do not navigate; they print. This injects
   a single floating "Save as PDF" button (and a P keyboard
   shortcut) that calls window.print(). The button is hidden in
   print and in ?embed mode. Works for any paged print medium:
   documents (.doc-stage) and social carousels (.social-stage).
   Optional: an artifact works fine without this file (Cmd/Ctrl-P
   still saves a PDF); it is purely a convenience.
   ============================================================ */
(function () {
  "use strict";

  function printPdf() { window.print(); }

  function init() {
    if (!document.querySelector(".doc-stage, .social-stage")) return;

    // stamp unit numbers into [data-slide-no] slots (social cards / pages)
    var units = document.querySelectorAll(".social-card, .doc-page");
    Array.prototype.forEach.call(units, function (u, i) {
      var slots = u.querySelectorAll("[data-slide-no]");
      Array.prototype.forEach.call(slots, function (el) {
        if (!el.hasAttribute("data-fixed")) el.textContent = String(i + 1) + " / " + units.length;
      });
    });
    if (/[?&]embed\b/.test(window.location.search)) document.body.classList.add("is-embed");

    var btn = document.createElement("button");
    btn.className = "doc-export";
    btn.type = "button";
    btn.setAttribute("aria-label", "Save as PDF");
    btn.setAttribute("title", "Save as PDF (P)");
    btn.textContent = "Save as PDF";
    btn.addEventListener("click", printPdf);
    document.body.appendChild(btn);

    window.addEventListener("keydown", function (e) {
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if ((e.key === "p" || e.key === "P") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        printPdf();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
