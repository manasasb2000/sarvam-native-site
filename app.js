/* =====================================================================
   Sarvam-native site — shared animation engine (vanilla, no deps)
   Loaded on every page. Everything is feature-detected and no-ops if the
   relevant markup isn't present, so it's safe to include anywhere.
   ===================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hover = window.matchMedia && window.matchMedia("(hover: hover)").matches;

  /* shared pointer state (used by spotlight + flow field) */
  var M = { x: innerWidth / 2, y: innerHeight * 0.35, active: false };

  /* ---- inject background FX + flow-field canvas + spotlight + scroll bar ---- */
  function injectChrome() {
    if (!document.querySelector(".bg-fx")) {
      var fx = document.createElement("div");
      fx.className = "bg-fx";
      fx.innerHTML =
        '<div class="grid"></div><div class="beam b1"></div><div class="beam b2"></div><div class="beam b3"></div>';
      document.body.insertBefore(fx, document.body.firstChild);
    }
    if (!document.querySelector(".flowfield")) {
      var cv = document.createElement("canvas");
      cv.className = "flowfield";
      document.body.insertBefore(cv, document.body.firstChild);
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

  /* ---- pointer tracking (spotlight + field) ---- */
  function cursor() {
    if (!hover) return;
    var raf = null;
    window.addEventListener("mousemove", function (e) {
      M.x = e.clientX; M.y = e.clientY; M.active = true;
      document.body.classList.add("has-cursor");
      if (raf || reduce) return;
      raf = requestAnimationFrame(function () {
        document.documentElement.style.setProperty("--mx", M.x + "px");
        document.documentElement.style.setProperty("--my", M.y + "px");
        raf = null;
      });
    });
    window.addEventListener("mouseleave", function () { M.active = false; });
  }

  /* ---- interactive flow-field (iron-filings around the cursor) ---- */
  function field() {
    var canvas = document.querySelector(".flowfield");
    if (!canvas || reduce) return;               // static for reduced-motion
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var GAP = 30;                                 // grid spacing (px)
    var LEN = 9;                                  // base stroke half-length
    var RADIUS = 190;                             // cursor influence radius
    var cols = [];                                // precomputed base angles
    var W = 0, H = 0;

    function build() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // base angle per cell — a calm woven pattern (deterministic)
      cols = [];
      for (var x = GAP / 2; x < W; x += GAP) {
        for (var y = GAP / 2; y < H; y += GAP) {
          var a = Math.sin(x * 0.015) * Math.cos(y * 0.017) * Math.PI; // smooth field
          cols.push({ x: x, y: y, a: a });
        }
      }
    }

    function shortestLerp(a, b, t) {
      var d = b - a;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      return a + d * t;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var mx = M.x, my = M.y;
      var r2 = RADIUS * RADIUS;
      for (var i = 0; i < cols.length; i++) {
        var p = cols[i];
        var dx = p.x - mx, dy = p.y - my;
        var dist2 = dx * dx + dy * dy;
        var w = 0, ang = p.a, len = LEN, alpha = 0.10;
        if (M.active && dist2 < r2 * 2.2) {
          var dist = Math.sqrt(dist2);
          w = Math.max(0, 1 - dist / RADIUS);      // 1 at cursor → 0 at edge
          w = w * w;                                // ease
          var radial = Math.atan2(dy, dx);          // point AWAY from cursor
          ang = shortestLerp(p.a, radial, w);
          len = LEN + w * 12;                        // stretch near cursor
          alpha = 0.10 + w * 0.55;                   // brighten near cursor
        }
        var ca = Math.cos(ang) * len, sa = Math.sin(ang) * len;
        // colour shifts blue→violet with influence
        var g = Math.round(150 + w * 20), b = Math.round(230 + w * 20);
        ctx.strokeStyle = "rgba(" + (120 + Math.round(w * 40)) + "," + g + "," + b + "," + alpha + ")";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x - ca, p.y - sa);
        ctx.lineTo(p.x + ca, p.y + sa);
        ctx.stroke();
      }
      requestAnimationFrame(draw);
    }

    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(build, 150); });
    build();
    requestAnimationFrame(draw);
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

  /* ---- count-up numbers ---- */
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
    if (reduce || !hover) return;
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

  function safe(fn) { try { fn(); } catch (e) { if (window.console) console.error("[app.js]", e); } }

  function init() {
    // Content-critical first: these MUST run so nothing stays hidden,
    // even if a decorative effect below throws.
    safe(injectChrome);
    safe(stagger);
    safe(reveals);
    safe(counters);
    safe(scrollUI);
    safe(tilt);
    safe(livePanels);
    // Decorative background effects last (isolated in try/catch).
    safe(cursor);
    safe(field);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
