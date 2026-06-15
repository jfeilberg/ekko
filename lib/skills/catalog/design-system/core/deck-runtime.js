/* ============================================================
   deck-runtime.js — vanilla presentation engine
   ------------------------------------------------------------
   Zero dependencies. Drop a <script> tag for this file at the
   end of <body>. It finds the first `.deck-stage > .deck-canvas`
   and the `.slide` elements inside it, then provides:

     • Proportional scaling of the 1600x900 canvas to the window
       (ResizeObserver + resize), letter-boxed and centered.
     • Keyboard navigation:
         → / Space / PageDown   next
         ← / PageUp             previous
         Home / End             first / last
         digits                 jump to slide N (multi-digit:
                                type "12" within a beat for 12)
         F                      fullscreen
         P                      print / Save as PDF
     • Touch: horizontal swipe to navigate.
     • URL hash sync: #N deep-links a slide and updates as you
       navigate, so a link always reopens on the same slide.
     • Slide-number stamping: any element with a `data-slide-no`
       attribute is filled with its slide's 1-based number.
     • An auto-hiding overlay (prev · counter · next) and a
       persistent "Export PDF" button.
     • ?embed in the URL hides the export button (embed mode).

   The HTML contract (see templates/deck.template.html):
     <div class="deck-stage">
       <div class="deck-canvas">
         <section class="slide"> ... </section>
         <section class="slide"> ... </section>
       </div>
     </div>
   Overlay + export button are injected automatically.
   ============================================================ */
(function () {
  "use strict";

  function init() {
    var stage = document.querySelector(".deck-stage");
    var canvas = stage && stage.querySelector(".deck-canvas");
    if (!stage || !canvas) return;

    var W = parseInt(canvas.getAttribute("data-width"), 10) || 1600;
    var H = parseInt(canvas.getAttribute("data-height"), 10) || 900;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    var slides = Array.prototype.slice.call(canvas.querySelectorAll(":scope > .slide"));
    var total = slides.length;
    if (total === 0) return;

    var index = 0;
    var deckTitle = document.title || "deck";

    // ---- stamp slide numbers into [data-slide-no] slots ----
    slides.forEach(function (s, i) {
      var slots = s.querySelectorAll("[data-slide-no]");
      Array.prototype.forEach.call(slots, function (el) {
        if (!el.hasAttribute("data-fixed")) el.textContent = String(i + 1);
      });
    });

    // ---- embed mode ----
    var isEmbed = /[?&]embed\b/.test(window.location.search);
    if (isEmbed) document.body.classList.add("is-embed");

    // ---- build overlay + export controls ----
    var overlay = document.createElement("div");
    overlay.className = "deck-overlay";
    var prevBtn = document.createElement("button");
    prevBtn.className = "deck-overlay__btn";
    prevBtn.setAttribute("aria-label", "Previous slide");
    prevBtn.textContent = "←";
    var count = document.createElement("span");
    count.className = "deck-overlay__count";
    var nextBtn = document.createElement("button");
    nextBtn.className = "deck-overlay__btn";
    nextBtn.setAttribute("aria-label", "Next slide");
    nextBtn.textContent = "→";
    overlay.appendChild(prevBtn);
    overlay.appendChild(count);
    overlay.appendChild(nextBtn);
    stage.appendChild(overlay);

    var exportBtn = document.createElement("button");
    exportBtn.className = "deck-export";
    exportBtn.setAttribute("aria-label", "Export deck as PDF");
    exportBtn.setAttribute("title", "Export as PDF (P)");
    exportBtn.textContent = "Export PDF";
    stage.appendChild(exportBtn);

    // ---- top progress / section tracker bar (mounted on the canvas) ----
    var progress = document.createElement("div");
    progress.className = "deck-progress";
    var progressFill = document.createElement("div");
    progressFill.className = "deck-progress__fill";
    progress.appendChild(progressFill);
    canvas.appendChild(progress);

    function pad(n) { return String(n).padStart(2, "0"); }

    function render() {
      for (var i = 0; i < total; i++) {
        if (i === index) slides[i].setAttribute("data-active", "");
        else slides[i].removeAttribute("data-active");
        slides[i].setAttribute("aria-hidden", i === index ? "false" : "true");
      }
      count.textContent = pad(index + 1) + " / " + pad(total);
      progressFill.style.width = ((index + 1) / total * 100) + "%";
      if (slides[index].classList.contains("slide--dark")) progress.classList.add("is-on-dark");
      else progress.classList.remove("is-on-dark");
      // keep the URL pointing at the current slide (no history spam)
      if (history.replaceState) history.replaceState(null, "", "#" + (index + 1));
      showOverlay();
    }

    function go(i) {
      index = Math.max(0, Math.min(total - 1, i));
      render();
    }
    function next() { go(index + 1); }
    function prev() { go(index - 1); }

    function printPdf() {
      var original = document.title;
      document.title = deckTitle;
      window.print();
      window.setTimeout(function () { document.title = original; }, 1000);
    }

    function toggleFullscreen() {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    }

    // ---- scaling ----
    function updateScale() {
      var rect = stage.getBoundingClientRect();
      var s = Math.min(rect.width / W, rect.height / H) || 1;
      canvas.style.transform = "translate(-50%, -50%) scale(" + s + ")";
    }
    updateScale();
    if (typeof ResizeObserver !== "undefined") {
      var ro = new ResizeObserver(updateScale);
      ro.observe(stage);
    }
    window.addEventListener("resize", updateScale);

    // ---- multi-digit jump buffer ----
    var digitBuf = "";
    var digitTimer = null;
    function pushDigit(d) {
      digitBuf += d;
      if (digitTimer) clearTimeout(digitTimer);
      var commit = function () {
        var n = parseInt(digitBuf, 10);
        digitBuf = "";
        if (!isNaN(n) && n >= 1 && n <= total) go(n - 1);
      };
      // commit immediately when no further digit could still match a slide
      if (parseInt(digitBuf + "0", 10) > total) commit();
      else digitTimer = setTimeout(commit, 650);
    }

    // ---- keyboard ----
    window.addEventListener("keydown", function (e) {
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault(); next(); break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault(); prev(); break;
        case "Home":
          e.preventDefault(); go(0); break;
        case "End":
          e.preventDefault(); go(total - 1); break;
        case "p":
        case "P":
          e.preventDefault(); printPdf(); break;
        case "f":
        case "F":
          e.preventDefault(); toggleFullscreen(); break;
        default:
          if (/^[0-9]$/.test(e.key)) pushDigit(e.key);
      }
    });

    // ---- touch: horizontal swipe ----
    var touchX = null, touchY = null;
    stage.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) { touchX = null; return; }
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    }, { passive: true });
    stage.addEventListener("touchend", function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      var dy = e.changedTouches[0].clientY - touchY;
      touchX = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) next(); else prev();
      }
    }, { passive: true });

    // ---- controls ----
    prevBtn.addEventListener("click", prev);
    nextBtn.addEventListener("click", next);
    exportBtn.addEventListener("click", printPdf);

    // ---- overlay auto-hide ----
    var hideTimer = null;
    function showOverlay() {
      overlay.classList.add("is-visible");
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        overlay.classList.remove("is-visible");
      }, 1800);
    }
    window.addEventListener("mousemove", showOverlay);

    // ---- deep-linking via #3 etc. (on load and on manual hash edits) ----
    function readHash() {
      var hash = parseInt(window.location.hash.replace("#", ""), 10);
      if (!isNaN(hash) && hash >= 1 && hash <= total) return hash - 1;
      return null;
    }
    var initial = readHash();
    if (initial !== null) index = initial;
    window.addEventListener("hashchange", function () {
      var h = readHash();
      if (h !== null && h !== index) go(h);
    });

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
