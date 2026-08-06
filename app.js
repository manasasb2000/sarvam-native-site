/* =====================================================================
   Sarvam-native site — shared animation engine (vanilla, no deps)
   Loaded on every page. Everything is feature-detected and no-ops if the
   relevant markup isn't present, so it's safe to include anywhere.
   ===================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- inject background FX + spotlight + scroll bar (once) ---- */
  function injectChrome() {
    if (!document.querySelector(".bg-fx")) {
      var fx = document.createElement("div");
      fx.className = "bg-fx";
      fx.innerHTML =
        '<div class="grid"></div><div class="beam b1"></div><div class="beam b2"></div><div class="beam b3"></div>';
      document.body.insertBefore(fx, document.body.firstChild);
    }
    if (!document.querySelector(".spotlight")) {
      var sp = document.createElement("div");
      sp.className = "spotlight";
      document.body.insertBefore(sp, document.body.firstChild);
    }
    if (!document.querySelector(".scroll-progress")) {
      var bar = document.createElement("div");
      bar.className = "scroll-progress";
      document.body.appendChild(bar);
    }
  }

  /* ---- cursor spotlight ---- */
  function cursor() {
    if (reduce || !window.matchMedia("(hover: hover)").matches) return;
    var raf = null, x = 0, y = 0;
    window.addEventListener("mousemove", function (e) {
      x = e.clientX; y = e.clientY;
      document.body.classList.add("has-cursor");
      if (raf) return;
      raf = requestAnimationFrame(function () {
        document.documentElement.style.setProperty("--mx", x + "px");
        document.documentElement.style.setProperty("--my", y + "px");
        raf = null;
      });
    });
  }

  /* ---- scroll progress + nav state ---- */
  function scrollUI() {
    var bar = document.querySelector(".scroll-progress");
    var nav = document.querySelector("nav");
    function upd() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
      if (bar) bar.style.width = (pct * 100).toFixed(2) + "%";
      if (nav) nav.classList.toggle("scrolled", (h.scrollTop || 0) > 12);
    }
    document.addEventListener("scroll", upd, { passive: true });
    upd();
  }

  /* ---- reveal on scroll ---- */
  function reveals() {
    var els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---- auto-stagger children marked with [data-stagger] ---- */
  function stagger() {
    document.querySelectorAll("[data-stagger]").forEach(function (parent) {
      Array.prototype.forEach.call(parent.children, function (c, i) {
        if (c.classList.contains("reveal")) c.style.setProperty("--i", i);
      });
    });
  }

  /* ---- count-up numbers ([data-count] holds the target; text is the suffix) ---- */
  function counters() {
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;
    function run(el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var decimals = (el.getAttribute("data-decimals") | 0);
      var suffix = el.getAttribute("data-suffix") || "";
      var prefix = el.getAttribute("data-prefix") || "";
      if (reduce) { el.textContent = prefix + target.toFixed(decimals) + suffix; return; }
      var dur = 1400, start = performance.now();
      function tick(now) {
        var p = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = prefix + target.toFixed(decimals) + suffix;
      }
      requestAnimationFrame(tick);
    }
    if (!("IntersectionObserver" in window)) { nums.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    nums.forEach(function (el) { io.observe(el); });
  }

  /* ---- card tilt on pointer ---- */
  function tilt() {
    if (reduce || !window.matchMedia("(hover: hover)").matches) return;
    document.querySelectorAll(".tilt").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty("--ry", (px * 8).toFixed(2) + "deg");
        card.style.setProperty("--rx", (-py * 8).toFixed(2) + "deg");
      });
      card.addEventListener("mouseleave", function () {
        card.style.setProperty("--ry", "0deg");
        card.style.setProperty("--rx", "0deg");
      });
    });
  }

  /* ---- live panel: reveal rows sequentially when it enters view ---- */
  function livePanels() {
    var panels = document.querySelectorAll(".live-panel[data-autoplay]");
    if (!panels.length) return;
    function play(panel) {
      var rows = panel.querySelectorAll(".live-row");
      rows.forEach(function (row, i) {
        setTimeout(function () { row.classList.add("show"); }, reduce ? 0 : i * 520);
      });
      var verdict = panel.querySelector(".verdict");
      if (verdict) setTimeout(function () { verdict.classList.add("show"); verdict.style.opacity = 1; }, reduce ? 0 : rows.length * 520 + 200);
    }
    if (!("IntersectionObserver" in window)) { panels.forEach(play); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { play(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.35 });
    panels.forEach(function (p) { io.observe(p); });
  }

  function init() {
    injectChrome();
    cursor();
    scrollUI();
    stagger();
    reveals();
    counters();
    tilt();
    livePanels();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
