/* ==========================================================================
   Pip website · js/site.js
   Vanilla, no libraries, loaded with defer. One module per behaviour, each
   guarded on its own markup so every page can load the same file:

     util       helpers the modules share
     dates      every date in the examples, worked out from today
     header     the scrolled header and the phone menu sheet
     stops      the hero's "Stop …" headline: what it stops turns underneath
     mascots    the live Pip: blink, and eyes that follow the cursor
     reveal     sections arriving on scroll
     scenes     the try-it demos: find, help, like, and the briefed and switch moments
     takeover   "Go on, have a play": the real Pip, full screen, on request
     jobs       the six one-click jobs
     accordion  questions that open with height and fade
     jumpList   the questions page's group list
     signup     the first-50 sign-up form (download.html)

   Reduced motion is a real mode: every module renders its end state and
   nothing loops, types or slides.
   ========================================================================== */
(function () {
  "use strict";

  /* ── util ──────────────────────────────────────────────────────────────── */

  var EASE_OUT = "cubic-bezier(0.2, 0.8, 0.2, 1)";
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var CANCELLED = { cancelled: true };

  function reduced() { return !!(motionQuery && motionQuery.matches); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* An icon from the inline sprite, at one of the system's sizes */
  function icon(name, size) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "i i-" + size);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var use = document.createElementNS(ns, "use");
    use.setAttribute("href", "#i-" + name);
    svg.appendChild(use);
    return svg;
  }

  /* Pip's small face, idle or thinking */
  function face(size, thinking) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "pf pf-" + size);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var use = document.createElementNS(ns, "use");
    use.setAttribute("href", thinking ? "#pip-think" : "#pip-face");
    svg.appendChild(use);
    return svg;
  }

  /* Swap a small face between idle and thinking, in place */
  function setThinking(holder, on) {
    var use = holder && holder.querySelector("use");
    if (use) use.setAttribute("href", on ? "#pip-think" : "#pip-face");
  }

  function dots() {
    var wrap = el("span", "dots");
    wrap.setAttribute("aria-hidden", "true");
    wrap.appendChild(el("i"));
    wrap.appendChild(el("i"));
    wrap.appendChild(el("i"));
    return wrap;
  }

  /* Run fn once, when node is far enough into view */
  function onceVisible(node, fn, threshold) {
    if (!("IntersectionObserver" in window)) { fn(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { io.disconnect(); fn(); }
      });
    }, { threshold: threshold || 0.35 });
    io.observe(node);
  }

  /* Move 5, change in place: the old leaves in 100ms, the new arrives in 150ms */
  function swapText(node, text) {
    if (!node || node.textContent === text) return;
    if (reduced() || !node.animate) { node.textContent = text; return; }
    var out = node.animate(
      [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(2px)" }],
      { duration: 100, easing: EASE_OUT, fill: "forwards" }
    );
    out.onfinish = function () {
      node.textContent = text;
      node.animate(
        [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }],
        { duration: 150, easing: EASE_OUT }
      );
      out.cancel();
    };
  }

  /* Move 7, point at it: a coral wash that holds, then goes. Once. */
  function wash(node) {
    if (!node) return;
    node.classList.remove("is-washed");
    void node.offsetWidth;
    node.classList.add("is-washed");
    setTimeout(function () { node.classList.remove("is-washed"); }, 1300);
  }

  /* A scripted vignette moment. It plays once when it comes into view, rests at
     its end state, and offers Replay (a quiet button under the window, named by
     data-replay-for). Under reduced motion it only ever shows the end state.
     scene = { start(), play(sleep), end() } */
  function createScene(root, scene) {
    var run = 0;
    var replay = $('[data-replay-for="' + root.getAttribute("data-scene") + '"]');

    function sleeper(id) {
      return function (ms) {
        return new Promise(function (resolve, reject) {
          setTimeout(function () { if (id === run) resolve(); else reject(CANCELLED); }, ms);
        });
      };
    }

    function showReplay() {
      if (!replay) return;
      replay.hidden = false;
      replay.disabled = false;
    }

    function go() {
      var id = ++run;
      if (reduced()) { scene.end(); return; }
      if (replay && !replay.hidden) replay.disabled = true;
      scene.start();
      Promise.resolve()
        .then(function () { return scene.play(sleeper(id)); })
        .then(function () {
          if (id !== run) return;
          scene.end();
          showReplay();
        })
        .catch(function (err) { if (err !== CANCELLED) throw err; });
    }

    if (replay) replay.addEventListener("click", go);

    if (!reduced()) {
      scene.start();
      onceVisible(root, function () { setTimeout(go, 420); }, 0.35);
    }

    return {
      cancel: function () { run++; },
      showReplay: showReplay,
      replay: replay
    };
  }



  /* ── dates ─────────────────────────────────────────────────────────────────
     Nothing on the site goes stale. Every date in the Lume examples is worked
     out from today: the drum workshop is the next Sunday at least four days
     away, the lino day the Saturday three weeks after it, chats are so many days ago, and
     the sales sheet is this year's (last year's until April). The HTML holds
     a sensible fallback in each [data-date] span for when this doesn't run. */

  var D = (function () {
    var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var today = new Date(); today.setHours(12, 0, 0, 0);
    function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
    var drum = addDays(today, 4);
    while (drum.getDay() !== 0) drum = addDays(drum, 1);
    var lino = addDays(drum, 20); // the Saturday that ends the third week after the drum Sunday
    var xmas = new Date(today.getFullYear(), 11, 18, 12);
    if (today > xmas) xmas = new Date(today.getFullYear() + 1, 11, 18, 12);
    var prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    var prevMonth2 = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    function long(d) { return DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()]; }
    function lower(d) { return (DAYS[d.getDay()].slice(0, 3) + " " + d.getDate() + " " + MONTHS[d.getMonth()].slice(0, 3)).toLowerCase(); }
    function short(d) { return d.getDate() + " " + MONTHS[d.getMonth()].slice(0, 3); }
    function dayMonth(d) { return d.getDate() + " " + MONTHS[d.getMonth()]; }
    return {
      drum: drum, lino: lino, xmas: xmas, long: long, lower: lower, short: short, dayMonth: dayMonth,
      month: MONTHS[today.getMonth()],
      monthPrev: MONTHS[prevMonth.getMonth()],
      monthPrev2: MONTHS[prevMonth2.getMonth()],
      year: String(today.getFullYear()),
      salesYear: String(today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1),
      ago: function (n) { return short(addDays(today, -n)); }
    };
  })();

  function dates() {
    $$("[data-date]").forEach(function (node) {
      var key = node.getAttribute("data-date");
      var fmt = node.getAttribute("data-fmt");
      var text = null;
      if (key === "drum" || key === "lino") text = fmt === "lower" ? D.lower(D[key]) : D.long(D[key]);
      else if (key === "xmas") text = fmt === "lower" ? D.dayMonth(D.xmas).toLowerCase().replace(/ (\w{3})\w*$/, " $1") : D.dayMonth(D.xmas);
      else if (key === "month") text = D.month;
      else if (key === "month-prev") text = D.monthPrev;
      else if (key === "month-prev2") text = D.monthPrev2;
      else if (key === "year") text = D.year;
      else if (key === "sales-year") text = D.salesYear;
      else if (key.indexOf("ago:") === 0) text = D.ago(parseInt(key.slice(4), 10) || 0);
      if (text) node.textContent = text;
    });
  }


  /* ── stops ─────────────────────────────────────────────────────────────────
     The hero reads "Stop …" and what it stops turns every 3.5s. "Stop" never
     moves. Laptop: a reel on its right, the stops before and after faint above
     and below. Phone: only the current stop, under "Stop", flipping to the
     next. Both are sized by the longest stop and never change size, so nothing
     on the page moves. It waits for the hero's entrance, pauses on hover, when
     the hero is off screen and when the tab is hidden, and doesn't turn at all
     under reduced motion (the first stop stays). */
  var STOPS = [
    "being intimidated by AI.",
    "treating AI like Google.",
    "losing work in AI chats.",
    "copying and pasting from AI.",
    "repeating yourself to AI.",
    "sounding like a robot.",
    "staring at a blank page.",
    "making do with free AI.",
    "feeding your data to AI."
  ];
  var STOPS_EVERY = 3500;

  function stops() {
    var reel = $("[data-stops]");
    if (!reel) return;
    var h1 = reel.closest("h1"), line = reel.closest(".stops-line");
    var track = $(".stops-track", reel), flip = $(".stops-flip", reel);
    var phoneQuery = window.matchMedia ? window.matchMedia("(max-width: 700px)") : null;
    var n = STOPS.length, at = n, hover = false, onScreen = true, timer = null, phoneMode = null;

    function phone() { return !!(phoneQuery && phoneQuery.matches); }
    function probe() {
      var p = document.createElement("span");
      p.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font:inherit;letter-spacing:inherit";
      h1.appendChild(p);
      return p;
    }
    function widthOf(p, text) { p.textContent = text; return p.getBoundingClientRect().width; }
    function splitTwo(p, text) {
      var words = text.split(" "), best = null;
      for (var k = 1; k < words.length; k++) {
        var worst = Math.max(widthOf(p, words.slice(0, k).join(" ")), widthOf(p, words.slice(k).join(" ")));
        if (!best || worst < best.worst) best = { k: k, worst: worst };
      }
      return { l1: words.slice(0, best.k).join(" "), l2: words.slice(best.k).join(" "), w: best.worst };
    }

    // Laptop: the reel is as wide as the longest stop, and the headline steps
    // down a size if "Stop" and the longest stop can't share the line.
    function fitReel() {
      h1.style.fontSize = "";
      var p = probe(), em = parseFloat(getComputedStyle(h1).fontSize);
      var longest = STOPS.reduce(function (w, s) { return Math.max(w, widthOf(p, s)); }, 0);
      var stopW = widthOf(p, "Stop");
      p.remove();
      var reelEm = longest / em + 0.1;
      reel.style.setProperty("--reel-w", reelEm.toFixed(3) + "em");
      // the hero column's width, not the h1's (the h1 shrinks to its content)
      var maxPx = h1.parentElement.getBoundingClientRect().width / (stopW / em + 0.28 + reelEm + 0.2);
      if (em > maxPx) h1.style.fontSize = Math.floor(maxPx) + "px";
    }
    function buildReel() {
      track.textContent = "";
      for (var c = 0; c < 3; c++) STOPS.forEach(function (s) { track.appendChild(el("span", "stops-row", s)); });
      at = n + (at % n);
      placeReel(false);
    }
    function placeReel(turn) {
      var row = track.firstChild ? track.firstChild.getBoundingClientRect().height : 0;
      track.classList.toggle("is-turning", !!turn && !reduced());
      track.style.transform = "translateY(" + (-(at - 1) * row) + "px)";
      Array.prototype.forEach.call(track.children, function (r, k) { r.classList.toggle("is-now", k === at); });
    }

    // Phone: the largest size (34 down to 24px) at which every stop fits the
    // width on one line, or else every stop on two balanced lines.
    function fitFlip() {
      h1.style.fontSize = "";
      var width = h1.parentElement.getBoundingClientRect().width - 8, p = probe(), px = 34, lines = 1;
      for (; px >= 24; px--) {
        h1.style.setProperty("--stops-font", px + "px");
        if (STOPS.every(function (s) { return widthOf(p, s) <= width; })) { lines = 1; break; }
        if (STOPS.every(function (s) { return splitTwo(p, s).w <= width; })) { lines = 2; break; }
      }
      flip.textContent = "";
      STOPS.forEach(function (s) {
        var r = el("span", "flip-row");
        if (lines === 2) { var sp = splitTwo(p, s); r.appendChild(document.createTextNode(sp.l1)); r.appendChild(document.createElement("br")); r.appendChild(document.createTextNode(sp.l2)); }
        else r.textContent = s;
        flip.appendChild(r);
      });
      p.remove();
      reel.style.setProperty("--flip-h", Math.ceil(px * 1.15 * lines + 2) + "px");
      placeFlip(false);
    }
    function placeFlip(turn) {
      var now = at % n, prev = (now - 1 + n) % n;
      flip.classList.toggle("is-still", !turn || reduced());
      Array.prototype.forEach.call(flip.children, function (r, k) {
        r.classList.toggle("is-now", k === now);
        r.classList.toggle("is-gone", k === prev && !!turn);
      });
    }

    function layout() {
      phoneMode = phone();
      if (phoneMode) fitFlip(); else { fitReel(); buildReel(); }
    }
    function turn() {
      if (hover || !onScreen || document.hidden) return;
      at += 1;
      if (phoneMode) placeFlip(true);
      else {
        placeReel(true);
        if (at >= n * 2) setTimeout(function () { at -= n; placeReel(false); }, 950);
      }
    }

    layout();
    if (reduced()) return;
    line.addEventListener("mouseenter", function () { hover = true; });
    line.addEventListener("mouseleave", function () { hover = false; });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; }).observe(h1);
    }
    var resizeT = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(layout, 120);
    });
    // Start once the hero has arrived and the fonts are in.
    var go = function () { setTimeout(function () { timer = setInterval(turn, STOPS_EVERY); }, 1600); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); go(); }); else go();
  }

  /* ── header ────────────────────────────────────────────────────────────────
     Transparent at the top; after 8px of scroll it takes a Canvas ground at
     85%, a blur and a hairline. On phones the links live in a sheet that
     grows from the header (move 2, 220ms) and leaves in 100ms (move 8). */

  function header() {
    var bar = $("[data-header]");
    if (!bar) return;

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        bar.classList.toggle("is-scrolled", window.scrollY > 8);
        ticking = false;
      });
    }
    bar.classList.toggle("is-scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });

    var btn = $("[data-menu-btn]", bar);
    var sheet = $("[data-sheet]", bar);
    if (!btn || !sheet) return;
    var leaveTimer = null;

    function isOpen() { return btn.getAttribute("aria-expanded") === "true"; }

    function open() {
      clearTimeout(leaveTimer);
      sheet.hidden = false;
      sheet.classList.remove("is-leaving");
      sheet.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      btn.setAttribute("aria-label", "Close menu");
      bar.classList.add("is-open");
      var first = $("a", sheet);
      if (first) first.focus();
      document.addEventListener("keydown", onKey);
      document.addEventListener("pointerdown", onOutside, true);
    }

    function close(returnFocus) {
      if (!isOpen()) return;
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", "Menu");
      bar.classList.remove("is-open");
      sheet.classList.remove("is-open");
      sheet.classList.add("is-leaving");
      leaveTimer = setTimeout(function () {
        sheet.hidden = true;
        sheet.classList.remove("is-leaving");
      }, reduced() ? 0 : 100);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside, true);
      if (returnFocus) btn.focus();
    }

    function onKey(e) {
      if (e.key === "Escape") close(true);
    }
    function onOutside(e) {
      if (!bar.contains(e.target)) close(false);
    }

    btn.addEventListener("click", function () { if (isOpen()) close(true); else open(); });
    $$("a", sheet).forEach(function (a) { a.addEventListener("click", function () { close(false); }); });
    window.addEventListener("resize", function () { if (window.innerWidth >= 720) close(false); });
  }

  /* ── mascots ───────────────────────────────────────────────────────────────
     The live Pip (hero and close) blinks every few seconds and, on a desktop
     with a mouse, the pupils drift toward the cursor. The idle gaze is kept:
     the offset is added to the resting pupils, never centred. Off under
     reduced motion. */

  function mascots() {
    var pips = $$("[data-pip-live]");
    if (!pips.length || reduced()) return;

    pips.forEach(function (svg) {
      function blink() {
        svg.classList.remove("is-blinking");
        void svg.getBoundingClientRect();
        svg.classList.add("is-blinking");
        setTimeout(function () { svg.classList.remove("is-blinking"); }, 190);
      }
      (function next() {
        setTimeout(function () {
          blink();
          if (Math.random() < 0.18) setTimeout(blink, 260);
          next();
        }, 2800 + Math.random() * 3600);
      })();
    });

    var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!finePointer) return;

    var MAX = 42; // SVG units a pupil may travel from rest: it stays inside the eye white at every angle
    var eyes = pips.map(function (svg) {
      return {
        svg: svg,
        pupils: $$(".pip-pupil", svg).map(function (p) {
          return { node: p, x: +p.getAttribute("data-x"), y: +p.getAttribute("data-y") };
        }),
        cx: 0, cy: 0, tx: 0, ty: 0
      };
    });
    var mouse = null;
    var frame = 0;

    function step() {
      frame = 0;
      var moving = false;
      var vh = window.innerHeight;
      eyes.forEach(function (eye) {
        var r = eye.svg.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        if (mouse) {
          var dx = mouse.x - (r.left + r.width / 2);
          var dy = mouse.y - (r.top + r.height * 0.42);
          var dist = Math.sqrt(dx * dx + dy * dy) || 1;
          var reach = Math.min(1, dist / 520);
          eye.tx = (dx / dist) * MAX * reach;
          eye.ty = (dy / dist) * MAX * reach;
        } else {
          eye.tx = 0;
          eye.ty = 0;
        }
        eye.cx += (eye.tx - eye.cx) * 0.14;
        eye.cy += (eye.ty - eye.cy) * 0.14;
        if (Math.abs(eye.tx - eye.cx) > 0.15 || Math.abs(eye.ty - eye.cy) > 0.15) moving = true;
        eye.pupils.forEach(function (p) {
          p.node.setAttribute("transform", "translate(" + (p.x + eye.cx).toFixed(2) + " " + (p.y + eye.cy).toFixed(2) + ")");
        });
      });
      if (moving) frame = requestAnimationFrame(step);
    }
    function wake() { if (!frame) frame = requestAnimationFrame(step); }

    document.addEventListener("mousemove", function (e) { mouse = { x: e.clientX, y: e.clientY }; wake(); }, { passive: true });
    document.documentElement.addEventListener("mouseleave", function () { mouse = null; wake(); });
    window.addEventListener("scroll", wake, { passive: true });
  }

  /* ── reveal ────────────────────────────────────────────────────────────────
     A headline block rises 12px and fades in over 640ms when it is about a
     fifth in view, its children 70ms apart; a visual follows 120ms after.
     Once. Tall blocks count as in view once a quarter-screen of them shows. */

  function reveal() {
    var blocks = $$("[data-reveal]");
    blocks.forEach(function (block) {
      Array.prototype.forEach.call(block.children, function (child, i) {
        child.style.setProperty("--i", i);
      });
    });
    var targets = blocks.concat($$("[data-reveal-visual]"));
    if (!targets.length) return;

    if (reduced() || !("IntersectionObserver" in window)) {
      targets.forEach(function (t) { t.classList.add("is-in"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var enough = entry.intersectionRatio >= 0.18 || entry.intersectionRect.height >= window.innerHeight * 0.25;
        if (!enough) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { threshold: [0, 0.02, 0.05, 0.1, 0.18], rootMargin: "0px 0px -6% 0px" });

    targets.forEach(function (t) {
      // Whatever is already on the first screen arrives on load, without
      // waiting for the observer (which a background tab may hold back).
      var r = t.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.94 && r.bottom > 0) { t.classList.add("is-in"); return; }
      io.observe(t);
    });
  }


  /* ── scenes ────────────────────────────────────────────────────────────────
     Each vignette plays one short moment when it comes into view, then rests
     at its end state with a Replay button in its corner. The HTML is written
     at the end state, so without JavaScript or with reduced motion that is
     what shows. start() sets the opening frame, play() runs the moment,
     end() puts the end state back exactly. */

  /* Type text into a node a few letters at a time; resolves when done */
  function typeInto(node, text, sleep, fast) {
    var i = 0;
    function next() {
      if (i >= text.length) return Promise.resolve();
      i += fast ? 2 : 1;
      node.textContent = text.slice(0, i);
      var ch = text.charAt(i - 1);
      var ms = fast ? 14 : (ch === " " ? 34 : ch === "." || ch === "," ? 110 : 18 + Math.random() * 12);
      return sleep(ms).then(next);
    }
    return next();
  }

  /* A run of steps that a newer click cancels */
  function runner() {
    var run = 0;
    return {
      start: function () {
        var id = ++run;
        return function (ms) {
          return new Promise(function (resolve, reject) {
            setTimeout(function () { if (id === run) resolve(); else reject(CANCELLED); }, reduced() ? 0 : ms);
          });
        };
      },
      cancel: function () { run++; }
    };
  }
  function quietly(err) { if (err !== CANCELLED) throw err; }

  /* Never lose your work again: three searches. A button types its words into
     the search box; the results come in; the first one's folder opens in the
     file list and the file lights up. Search is the app's, not Pip's. */
  function findDemo() {
    var root = $("[data-find]");
    if (!root) return;
    var q = $("[data-find-q]", root);
    var count = $("[data-find-count]", root);
    var list = $("[data-find-results]", root);
    var tree = $$("[data-node]", root);
    var btns = $$("[data-q]", root);
    var R = runner();
    var SEARCHES = [
      { q: D.month.toLowerCase() + " newsletter", count: "2 results, in Newsletters", node: "Newsletters/October", results: [
        ["file-text", "Newsletter: " + D.month, "Newsletters · edited yesterday", "Hello, and thank you for such a lovely summer at the studio.", [D.month, "Newsletter"]],
        ["shapes", "Newsletter ideas", "Newsletters · canvas", D.month + ": the mustard scallop, the drum workshop, the lino day.", [D.month, "Newsletter"]]
      ] },
      { q: "drum workshop", count: "4 results: a note, slides, a table and a photo", node: "Workshops/Drum workshop steps", results: [
        ["file-text", "Drum workshop steps", "Workshops · note", "Cut the panel to size, stick the fabric on, roll it round the rings.", ["Drum workshop"]],
        ["presentation", "Drum workshop", "Workshops · slides", "Make a drum lampshade. Six slides, one for each step.", ["drum lampshade", "Drum workshop"]],
        ["table", "Bookings", "Workshops · table", "Drum workshop, " + D.long(D.drum) + ": 2 places left.", ["Drum workshop"]],
        ["image", "drum-step-2.jpg", "Products › Photos", "Jo wrapping fabric round a drum, in the workshop.", ["drum"]]
      ] },
      { q: "sales", count: "3 results, in Sales and Products", node: "Sales", results: [
        ["table", "Sales " + D.salesYear, "Sales · table", "September: shades £2,400, workshops £2,160.", ["Sales"]],
        ["dashboard", "Sales dashboard", "Sales · dashboard", "Workshops made 43% of sales this year.", ["sales", "Sales"]],
        ["table", "Shades sold", "Products · table", "Medium scallop, Natural and mustard, £300. Sold in two days.", ["Sold", "sold"]]
      ] }
    ];

    function marked(text, words) {
      var frag = document.createDocumentFragment();
      var re = new RegExp("(" + words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")", "i");
      text.split(re).forEach(function (part, k) {
        if (!part) return;
        if (k % 2 === 1) frag.appendChild(el("mark", "", part)); else frag.appendChild(document.createTextNode(part));
      });
      return frag;
    }
    function light(nodeName) {
      var folder = nodeName ? nodeName.split("/")[0] : "";
      tree.forEach(function (row) {
        var name = row.getAttribute("data-node");
        row.classList.toggle("is-selected", name === nodeName);
        row.classList.toggle("is-near", !!folder && (row.getAttribute("data-in") === folder || name === folder));
      });
    }
    function show(k, animate) {
      var S = SEARCHES[k];
      list.textContent = "";
      count.textContent = S.count;
      S.results.forEach(function (r, i) {
        var li = el("li", "fres" + (i === 0 ? " is-top" : ""));
        li.appendChild(icon(r[0], 16));
        var t = el("span", "fres-t");
        var b = el("b"); b.appendChild(marked(r[1], r[4])); t.appendChild(b);
        t.appendChild(el("span", "", r[2]));
        var line = el("span", "fres-line"); line.appendChild(marked(r[3], r[4])); t.appendChild(line);
        li.appendChild(t);
        if (animate) li.style.setProperty("--n", i);
        li.classList.toggle("is-new", !!animate);
        list.appendChild(li);
      });
      light(S.node);
    }

    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.classList.add("is-tried");
        var k = +btn.getAttribute("data-q");
        btns.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
        var sleep = R.start();
        if (reduced()) { q.textContent = SEARCHES[k].q; show(k, false); return; }
        q.textContent = "";
        root.classList.add("is-typing");
        list.classList.add("is-dim");
        typeInto(q, SEARCHES[k].q, sleep)
          .then(function () { root.classList.remove("is-typing"); return sleep(260); })
          .then(function () { list.classList.remove("is-dim"); show(k, true); })
          .catch(quietly);
      });
    });
  }

  /* Help with the bit you're stuck on: four ways to rewrite the highlighted
     part. Each replaces it in place (never crossed out), typed in, while the
     rest of the note stays as it was. "Back to my version" puts it back. The
     note holds the height of its longest version. */
  function helpDemo() {
    var root = $("[data-help]");
    if (!root) return;
    var text = $("[data-help-text]", root);
    var tag = $("[data-help-tag]", root);
    var msg = $("[data-help-msg]", root);
    var faceHolder = $("[data-help-face]", root);
    var back = $("[data-help-back]", root);
    var body = $("[data-help-body]", root);
    var btns = $$("[data-edit]", root);
    var R = runner();
    var ORIGINAL = text.textContent;
    var START = msg.textContent;
    var EDITS = [
      ["Our new sage linen lamp is in the shop: a linen shade on an oak base that looks lovely on a desk. £105, made to order in about two weeks.", "Tidied up. Same facts, easier to read.", "Tidying it up…"],
      ["New in: a sage linen lamp on an oak base. £105, made to order.", "Down to 13 words.", "Cutting it down…"],
      ["Our new sage linen lamp is in the shop. The shade is hand made in my studio in Hove and sits on a solid oak base, so it looks lovely on a desk or a bedside table. It's £105, made to order in about two weeks, with free UK delivery.", "Added what your notes say about it: made in Hove, free UK delivery.", "Adding more from your notes…"],
      ["The sage lamp has landed in the shop. Linen shade, oak base, and it looks lovely on a desk (tidier desks than mine, anyway). £105, made to order in about two weeks.", "In your voice: short, warm, with a little joke.", "Writing it like you…"]
    ];

    function say(t) { msg.classList.remove("is-busy"); setThinking(faceHolder, false); swapText(msg, t); }
    function busy(t) {
      setThinking(faceHolder, true);
      msg.textContent = "";
      msg.classList.add("is-busy");
      var w = el("span", "is-busy"); w.appendChild(dots()); w.appendChild(el("span", "", t));
      msg.appendChild(w);
    }
    function measure() {
      body.style.minHeight = "";
      var was = text.textContent, h = 0;
      [ORIGINAL].concat(EDITS.map(function (e) { return e[0]; })).forEach(function (t) {
        text.textContent = t; h = Math.max(h, body.getBoundingClientRect().height);
      });
      text.textContent = was;
      body.style.minHeight = Math.ceil(h) + "px";
      // and Pip's line at its longest message, so nothing below it moves
      msg.style.minHeight = "";
      var probe = el("p", "");
      probe.style.cssText = "position:absolute;visibility:hidden;top:0;left:" + msg.offsetLeft + "px;width:" + msg.getBoundingClientRect().width + "px";
      msg.parentNode.appendChild(probe);
      var most = 0;
      [START].concat(EDITS.map(function (e) { return e[1]; })).forEach(function (t) { probe.textContent = t; most = Math.max(most, probe.getBoundingClientRect().height); });
      probe.remove();
      msg.style.minHeight = Math.ceil(most) + "px";
    }
    function reset() {
      R.cancel();
      root.classList.remove("is-edited", "is-typing", "is-clearing");
      text.textContent = ORIGINAL;
      tag.textContent = "selected";
      btns.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      back.hidden = true;
      say(START);
    }

    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.classList.add("is-tried");
        var e = EDITS[+btn.getAttribute("data-edit")];
        btns.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
        var sleep = R.start();
        if (reduced()) {
          text.textContent = e[0]; root.classList.add("is-edited"); tag.textContent = "Pip's edit"; say(e[1]); back.hidden = false; return;
        }
        busy(e[2]);
        root.classList.remove("is-edited");
        root.classList.add("is-clearing");
        sleep(380)
          .then(function () { text.textContent = ""; root.classList.remove("is-clearing"); root.classList.add("is-typing", "is-edited"); tag.textContent = "Pip's edit"; return typeInto(text, e[0], sleep); })
          .then(function () { root.classList.remove("is-typing"); say(e[1]); back.hidden = false; })
          .catch(quietly);
      });
    });
    back.addEventListener("click", function () { reset(); btns[0].focus({ preventScroll: true }); });

    measure();
    var t = null;
    window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(measure, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  }

  /* The chat box at the foot of a Pip chat window: a question types into it,
     the send button lights, and sending clears it. */
  function composer(root) {
    var box = $("[data-composer]", root);
    var ph = $("[data-ph]", box);
    var typed = $("[data-typing]", box);
    return {
      box: box,
      reset: function () {
        typed.textContent = "";
        ph.hidden = false;
        box.classList.remove("is-typing", "is-ready");
      },
      type: function (text, sleep) {
        ph.hidden = true;
        box.classList.add("is-typing");
        var i = 0;
        function next() {
          if (i >= text.length) { box.classList.add("is-ready"); return Promise.resolve(); }
          i += 1;
          typed.textContent = text.slice(0, i);
          var ch = text.charAt(i - 1);
          return sleep(ch === " " ? 70 : ch === "?" || ch === "," ? 120 : 38 + Math.random() * 34).then(next);
        }
        return next();
      },
      send: function () {
        typed.textContent = "";
        ph.hidden = false;
        box.classList.remove("is-typing", "is-ready");
      }
    };
  }

  /* Already briefed: Pip's own chat. A question types into the box and is
     sent; Pip says where it's looking, then answers with the note or table it
     came from. Twice, back and forth. */
  function sceneBriefed() {
    var root = $('[data-scene="briefed"]');
    if (!root) return;
    var steps = $$("[data-step]", root);
    var box = composer(root);

    function clear() {
      steps.forEach(function (s) { s.classList.remove("is-shown", "is-thinking", "is-answered"); });
      box.reset();
    }

    createScene(root, {
      start: function () { clear(); root.classList.add("is-pre"); },
      play: function (sleep) {
        function pair(i) {
          if (i >= steps.length) return Promise.resolve();
          var q = steps[i];
          var a = steps[i + 1];
          return box.type(q.textContent, sleep)
            .then(function () { return sleep(420); })
            .then(function () { box.send(); q.classList.add("is-shown"); return sleep(520); })
            .then(function () { a.classList.add("is-shown", "is-thinking"); return sleep(1300); })
            .then(function () {
              a.classList.remove("is-thinking");
              a.classList.add("is-answered");
              return i + 2 < steps.length ? sleep(1800).then(function () { return pair(i + 2); }) : sleep(300);
            });
        }
        return sleep(400).then(function () { return pair(0); });
      },
      end: function () { clear(); root.classList.remove("is-pre"); }
    });
  }

  /* Switch AI: a chat already going, with its AI named in the chat box
     (Claude Sonnet 5) and under each answer. A pointer clicks the name, the
     menu opens up from it, the pointer picks Claude Opus 5.5, and the name
     changes. Then a follow-up goes in and the answer says it came from Opus,
     with the Sonnet answer still above it: same chat, different AI. */
  function sceneSwitch() {
    var root = $('[data-scene="switch"]');
    if (!root) return;
    var chat = $(".pchat", root);
    var steps = $$("[data-step]", root);
    var chip = $("[data-chip]", root);
    var label = $("[data-chip-label]", root);
    var opts = $$("[data-menu] .mopt", root);
    var cursor = $("[data-cursor]", root);
    var box = composer(root);
    var DEFAULT = 0, PICK = 1; // Claude Sonnet 5 → Claude Opus 5.5

    function choose(i, animate) {
      opts.forEach(function (o, k) { o.classList.toggle("is-on", k === i); o.classList.remove("is-hover"); });
      var name = opts[i].getAttribute("data-model");
      if (animate) swapText(label, name); else label.textContent = name;
    }
    // Put the pointer's tip on the middle of a node (or a point in the chat)
    function point(node, fx, fy) {
      var c = chat.getBoundingClientRect();
      var x, y;
      if (node) {
        var r = node.getBoundingClientRect();
        x = r.left - c.left + r.width * (fx || 0.5);
        y = r.top - c.top + r.height * (fy || 0.5);
      } else { x = c.width * fx; y = c.height * fy; }
      cursor.style.setProperty("--cx", (x - 2) + "px");
      cursor.style.setProperty("--cy", (y - 1.5) + "px");
    }
    function press(sleep) {
      cursor.classList.add("is-press");
      return sleep(130).then(function () { cursor.classList.remove("is-press"); });
    }
    function clear() {
      steps.forEach(function (s) { s.classList.remove("is-shown", "is-thinking", "is-answered"); });
      root.classList.remove("is-open");
      chip.classList.remove("is-on", "is-changed");
      cursor.classList.remove("is-on", "is-press");
      box.reset();
    }

    createScene(root, {
      start: function () { clear(); choose(DEFAULT); root.classList.add("is-pre"); },
      play: function (sleep) {
        var q = steps[0], a = steps[1];
        point(null, 0.62, 0.42);
        return sleep(500)
          .then(function () { cursor.classList.add("is-on"); return sleep(250); })
          .then(function () { point(chip, 0.55, 0.6); return sleep(900); })
          .then(function () { return press(sleep); })
          .then(function () { chip.classList.add("is-on"); root.classList.add("is-open"); return sleep(900); })
          .then(function () { point(opts[PICK], 0.3, 0.55); return sleep(760); })
          .then(function () { opts[PICK].classList.add("is-hover"); return sleep(420); })
          .then(function () { return press(sleep); })
          .then(function () { choose(PICK, true); chip.classList.add("is-changed"); return sleep(650); })
          .then(function () { root.classList.remove("is-open"); chip.classList.remove("is-on"); point(null, 0.78, 0.5); return sleep(500); })
          .then(function () { cursor.classList.remove("is-on"); chip.classList.remove("is-changed"); return sleep(500); })
          .then(function () { return box.type(q.textContent, sleep); })
          .then(function () { return sleep(400); })
          .then(function () { box.send(); q.classList.add("is-shown"); return sleep(500); })
          .then(function () { a.classList.add("is-shown", "is-thinking"); return sleep(1300); })
          .then(function () { a.classList.remove("is-thinking"); a.classList.add("is-answered"); return sleep(300); });
      },
      end: function () { clear(); choose(PICK); root.classList.remove("is-pre"); }
    });
  }

  /* See how Pip works like you: one request, written without and with what
     Pip knows from Jo's notes. The reply types into the email; with what Pip
     knows, the facts it used show underneath. */
  function likeDemo() {
    var root = $("[data-like]");
    if (!root) return;
    var text = $("[data-like-text]", root);
    var used = $("[data-like-used]", root);
    var mail = $("[data-like-mail]", root);
    var btns = $$("[data-like-mode]", root);
    var R = runner();
    var REPLIES = [
      "Dear Sarah, Thank you for your enquiry. Delivery times vary depending on the product. Please allow 3 to 5 business days. Kind regards",
      "Hi Sarah, thanks so much for your order. Each shade is made to order, so it takes up to 14 working days, and delivery is free anywhere in the UK. I'll let you know the moment it's on its way. Speak soon, Jo"
    ];
    function measure() {
      mail.style.minHeight = "";
      var was = text.innerHTML, h = 0;
      REPLIES.forEach(function (r) { text.textContent = r; h = Math.max(h, mail.getBoundingClientRect().height); });
      text.innerHTML = was;
      mail.style.minHeight = Math.ceil(h) + "px";
    }
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.classList.add("is-tried");
        var k = +btn.getAttribute("data-like-mode");
        btns.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
        root.classList.toggle("is-with", k === 1);
        root.classList.toggle("is-without", k === 0);
        used.classList.remove("is-shown");
        var sleep = R.start();
        if (reduced()) { text.textContent = REPLIES[k]; used.classList.toggle("is-shown", k === 1); return; }
        text.textContent = "";
        root.classList.add("is-typing");
        typeInto(text, REPLIES[k], sleep, true)
          .then(function () { root.classList.remove("is-typing"); if (k === 1) used.classList.add("is-shown"); })
          .catch(quietly);
      });
    });
    measure();
    var t = null;
    window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(measure, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  }

  function scenes() {
    findDemo();
    helpDemo();
    likeDemo();
    sceneBriefed();
    sceneSwitch();
  }


  /* ── takeover ──────────────────────────────────────────────────────────────
     The demo on the page is a still screenshot, so the page scrolls like a
     page. "Go on, have a play" is a real decision: the real Pip (the web demo)
     grows out of the screenshot to fill the screen, and Close or Esc puts it
     back. The frame loads on intent (hover, focus, or the section sitting in
     view), so it's usually ready by the click; until it says pip-demo:ready
     from its own origin, the screenshot stands in. On a large screen the app
     draws at its natural size; on a smaller one it draws at a laptop size and
     is scaled down to fit, so it never reflows into a layout the Mac app can't
     reach. Phones keep the screenshot and a line saying to use a laptop. */
  function takeover() {
    var play = $("#play");
    var dlg = $("#takeover");
    if (!play || !dlg) return;
    var src = play.getAttribute("data-live-demo");
    var go = $("[data-play-go]", play);
    var shot = $("[data-playground]", play);
    var alt = $("[data-takeover-alt]", dlg);
    var panel = $("[data-takeover-panel]", dlg);
    var stage = $("[data-takeover-stage]", dlg);
    var waitText = $("[data-takeover-wait-text]", dlg);
    var closeBtn = $("[data-takeover-close]", dlg);
    if (!src || !go || !shot || !window.matchMedia) return;
    var origin;
    try { origin = new URL(src, location.href).origin; } catch (e) { return; }
    alt.href = src;
    var big = window.matchMedia("(min-width: 768px)");
    var frame = null, ready = false, isOpen = false, slowTimer = null, lastFocus = null, anim = null;

    // The dialog belongs to the page, not to the section, so the rest can go
    // inert. Closed, it's laid out but unseen (see the CSS).
    document.body.appendChild(dlg);
    dlg.hidden = false;
    dlg.setAttribute("aria-hidden", "true");

    function sync() {
      go.hidden = !big.matches;
      play.classList.toggle("is-playable", big.matches);
    }
    sync();
    if (big.addEventListener) big.addEventListener("change", sync); else if (big.addListener) big.addListener(sync);

    function load() {
      if (frame || !big.matches) return;
      if (navigator.connection && navigator.connection.saveData && !isOpen) return;
      frame = document.createElement("iframe");
      frame.className = "takeover-frame";
      frame.src = src;
      frame.title = "Pip, with a sample business to play with";
      frame.setAttribute("referrerpolicy", "no-referrer");
      // Loaded but silent (an older demo, or a page that can't show frames):
      // show the frame anyway, and offer a new tab in case it's blank.
      frame.addEventListener("load", function () {
        setTimeout(function () {
          if (ready) return;
          dlg.classList.add("is-ready");
          alt.hidden = false;
        }, 3000);
      });
      stage.appendChild(frame);
      fit();
    }

    window.addEventListener("message", function (e) {
      if (e.origin !== origin || !e.data || e.data.type !== "pip-demo:ready") return;
      ready = true;
      clearTimeout(slowTimer);
      alt.hidden = true;
      dlg.classList.add("is-ready");
    });

    function fit() {
      if (!frame) return;
      var w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      var k = Math.min(1, w / 1280, h / 800);
      frame.style.width = Math.round(w / k) + "px";
      frame.style.height = Math.round(h / k) + "px";
      frame.style.transform = k < 1 ? "scale(" + k + ")" : "";
    }
    window.addEventListener("resize", fit);

    function setInert(on) {
      Array.prototype.forEach.call(document.body.children, function (node) {
        if (node === dlg || node.tagName === "SCRIPT") return;
        if (on) node.setAttribute("inert", ""); else node.removeAttribute("inert");
      });
    }

    // The panel starts exactly over the screenshot and grows to the screen
    function fromShot() {
      var r = shot.getBoundingClientRect();
      var k = r.width / window.innerWidth;
      return "translate(" + r.left + "px, " + r.top + "px) scale(" + k + ")";
    }

    function open() {
      if (isOpen || !big.matches) return;
      isOpen = true;
      lastFocus = document.activeElement;
      load();
      dlg.classList.add("is-open");
      dlg.removeAttribute("aria-hidden");
      document.documentElement.classList.add("has-takeover");
      setInert(true);
      fit();
      if (!ready) {
        waitText.textContent = "Opening Pip…";
        clearTimeout(slowTimer);
        slowTimer = setTimeout(function () {
          if (ready) return;
          waitText.textContent = "Still opening. Pip needs a moment on a slow connection.";
          alt.hidden = false;
        }, 8000);
      }
      if (anim) anim.cancel();
      if (!reduced() && panel.animate) {
        anim = panel.animate(
          [{ transform: fromShot(), borderRadius: "24px", opacity: 0.6 }, { transform: "none", borderRadius: "0px", opacity: 1 }],
          { duration: 560, easing: EASE_OUT }
        );
        dlg.animate([{ backgroundColor: "rgba(0,0,0,0)" }, { backgroundColor: "rgba(0, 0, 0, 0.32)" }], { duration: 560, easing: EASE_OUT });
      }
      closeBtn.focus({ preventScroll: true });
      document.addEventListener("keydown", onKey);
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      document.removeEventListener("keydown", onKey);
      clearTimeout(slowTimer);
      function done() {
        dlg.classList.remove("is-open");
        dlg.setAttribute("aria-hidden", "true");
        document.documentElement.classList.remove("has-takeover");
        setInert(false);
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); else go.focus({ preventScroll: true });
      }
      if (anim) anim.cancel();
      if (reduced() || !panel.animate) { done(); return; }
      anim = panel.animate(
        [{ transform: "none", borderRadius: "0px", opacity: 1 }, { transform: fromShot(), borderRadius: "24px", opacity: 0 }],
        { duration: 380, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" }
      );
      anim.onfinish = function () { anim.cancel(); anim = null; done(); };
    }

    function onKey(e) { if (e.key === "Escape") { e.preventDefault(); close(); } }

    go.addEventListener("click", open);
    closeBtn.addEventListener("click", close);

    // Load on intent, so the click usually finds Pip ready
    play.addEventListener("pointerenter", load);
    go.addEventListener("focus", load);
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        (window.requestIdleCallback || function (f) { return setTimeout(f, 1200); })(load);
      }, { threshold: 0.5 });
      io.observe(play);
    }
  }

  /* ── playground ────────────────────────────────────────────────────────────
     The desk under "Go on, have a play": with a mouse, Jo's things drift a
     few pixels away from the pointer, the nearer ones (--z) further, so the
     desk has depth. Off under reduced motion and on touch. */
  function playground() {
    var desk = $("[data-playground]");
    if (!desk || reduced() || !window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var objs = $$(".pg-obj", desk).map(function (o) { return { node: o, z: parseFloat(getComputedStyle(o).getPropertyValue("--z")) || 1 }; });
    var frame = 0, mx = 0, my = 0;
    function apply() {
      frame = 0;
      objs.forEach(function (o) {
        o.node.style.setProperty("--px", (-mx * 12 * o.z).toFixed(1) + "px");
        o.node.style.setProperty("--py", (-my * 9 * o.z).toFixed(1) + "px");
      });
    }
    desk.addEventListener("pointermove", function (e) {
      var r = desk.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width * 2 - 1;
      my = (e.clientY - r.top) / r.height * 2 - 1;
      if (!frame) frame = requestAnimationFrame(apply);
    });
    desk.addEventListener("pointerleave", function () { mx = 0; my = 0; if (!frame) frame = requestAnimationFrame(apply); });
  }

  /* ── jobs ──────────────────────────────────────────────────────────────────
     Six things you've made, and what each could become. Pick a job on the
     left (on a phone, a row of pills); the window changes in place (old out
     100ms, new in 150ms). The window always fits the screen and never changes
     size: CSS sizes it from the view, and Pip's bar keeps room for its longest
     message and widest buttons (fitBar). Pip offers; "Yes, …" plays the job in
     named steps, his face thinking and one live line saying what he's doing
     now; Replay puts the before back and plays it again. Picking a job, Next
     job and Replay bring the whole window into view. Under reduced motion
     every job lands on its end state at once. */

  function jobs() {
    var win = $("#jobs-win");
    if (!win) return;

    var JOBS = [
      { title: "Lume Lighting › Newsletter: " + D.month,
        intro: "You've jotted down this month's news. Want me to turn it into a first draft, in your words?",
        go: "Yes, draft it",
        steps: ["Writing it in your words…"],
        done: "Drafted from your notes, in your tone. The dates and prices came straight from them, so they're the bit to check." },
      { title: "Lume Lighting › sage-slim-lamp.jpg",
        intro: "Your sage lamp's on a busy desk. Want me to make it a product shot for the shop?",
        go: "Yes, make it a product shot",
        steps: ["Cropping it square…", "Taking out the notepad…", "Brightening it…"],
        done: "There's your product shot: square, bright and tidy, ready for the listing. Your original's still there if you want it back." },
      { title: "Lume Lighting › Bookings",
        intro: "Your lino day has six places. Want me to find who's likely to book?",
        go: "Yes, find them",
        steps: ["Looking through your bookings…", "Checking who's done lino…", "Saving them as a view…"],
        done: "Four people have made a drum shade with you but haven't done lino yet. I've saved them as a view, so they're easy to invite." },
      { title: "Lume Lighting › Drum workshop steps",
        intro: "You've got the steps for Sunday. Want them as a deck?",
        go: "Yes, make the deck",
        steps: ["Making a slide for each step…"],
        done: "Six slides, one for each step, with your step photos in. Move anything you like." },
      { title: "Lume Lighting › Spring collection · Canvas",
        intro: "Your spring ideas are all over the place. Want me to sort them and fill in what's missing?",
        go: "Yes, sort them",
        steps: ["Sorting your ideas…", "Pricing the 60cm scallop…"],
        done: "Sorted into fabrics, shapes and notes. Your 60cm scallop had no price, so I've pencilled in £400, following your sizes. Change it if you like." },
      { title: "Lume Lighting › Sales " + D.salesYear,
        intro: "This is your sales sheet, month by month. Want a chart of it, and a dashboard you can keep?",
        go: "Yes, show me",
        steps: ["Reading your sales sheet…", "Adding up the year…", "Drawing the chart…", "Looking for what stands out…"],
        done: "Here's one you might have missed: workshops made 43% of sales this year, up from 22% last year." }
    ];
    var NL = [
      "Hello, and thank you for such a lovely summer at the studio.",
      "The mustard scallop is finally in the shop. It's the linen I've been saving for months, and as always there's only one.",
      "Two places left on the drum workshop on " + D.long(D.drum) + ", so bring a fabric you love. And the lino printing day is open for " + D.long(D.lino) + ": six places, £110, and you take your printed shade home.",
      "The last posting day for Christmas is " + D.dayMonth(D.xmas) + ".",
      "Speak soon."
    ];
    // The idea(s) each paragraph is written from. "Speak soon." is how Jo signs off.
    var NL_FROM = [[4], [0], [1, 2], [3], []];
    var WORD_MS = 34, PARA_MS = 140;

    var jobBtns = $$(".job", win);
    var rail = $(".jobs-rail", win);
    var surfs = $$(".surf", win);
    var title = $("#jobs-title");
    var bar = $(".pipbar", win);
    var msg = $("#jobs-msg");
    var faceHolder = $("#jobs-face");
    var actions = $("#jobs-actions");
    var goBtn = $("#jobs-go");
    var replayBtn = $("#jobs-replay");
    var nextBtn = $("#jobs-next");
    var nextLabel = $("span", nextBtn);

    var note = $("#nl");
    var nlText = $("#nl-text");
    var ideasBox = $("#nl-ideas");
    var ideas = $$(".rough li", ideasBox);

    var photo = $("#photo-job");
    var frame = $("#photo-frame");
    var tools = $$(".ptool", photo);
    var PHOTO_BEFORE = frame.getAttribute("aria-label");
    var PHOTO_AFTER = "The same sage lamp, cropped square on the desk, tidied and brightened";
    var PHOTO_STATES = ["is-framing", "is-cropped", "is-square", "is-selecting", "is-filled", "is-bright"];

    var bk = $("#bk");
    var bkRows = $$(".bk-all tbody tr", bk);

    var deck = $("#deck-job");
    var slideEls = $$(".slide", deck);
    var stepLines = $$("[data-step-line]", deck);

    var cv = $("#cv");
    var cvPrices = $("#cv-prices");
    var cvPrice = $("#cv-price");
    var cvPriceText = $(".cv-t", cvPrice);
    var PRICE_BEFORE = cvPriceText.textContent;
    var PRICE_AFTER = "Scallop, 60cm: £400";

    var dash = $("#dash");
    var chart = $(".chart", dash);
    var tiles = $$(".tile-v", dash);

    var cur = 0, shown = 0, busy = false;
    var done = [false, false, false, false, false, false];
    var swapping = null;
    var lineNode = null;

    surfs.forEach(function (s, i) { s.hidden = i !== 0; });
    win.classList.add("is-ready");
    $$(".cvi", cv).forEach(function (c, i) { c.style.setProperty("--n", i); });
    $$(".pair", chart).forEach(function (p, i) { $$("i", p).forEach(function (b) { b.style.setProperty("--n", i); }); });

    function later(fn, ms) { setTimeout(fn, ms); }
    function lit(node, ms) {
      node.classList.add("is-lit");
      later(function () { node.classList.remove("is-lit"); }, ms);
    }

    /* Put a job's before back at once: no transition plays backwards */
    function instantly(fn) {
      win.classList.add("is-instant");
      fn();
      void win.offsetWidth;
      win.classList.remove("is-instant");
    }

    /* The whole window in view, under the sticky header, with a little air */
    function bringIntoView() {
      var r = win.getBoundingClientRect();
      var head = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 0;
      var top = head + 12;
      if (r.top >= top - 1 && r.bottom <= window.innerHeight - 11) return;
      window.scrollTo({ top: Math.round(window.scrollY + r.top - top), behavior: reduced() ? "auto" : "smooth" });
    }

    /* On a phone the rail is one sideways row: keep the chosen job in view and
       fade the edge that has more */
    function railEdges() {
      var max = rail.scrollWidth - rail.clientWidth;
      rail.classList.toggle("is-scrolled", rail.scrollLeft > 2);
      rail.classList.toggle("is-at-end", rail.scrollLeft >= max - 2);
    }
    function railTo(btn, smooth) {
      var max = rail.scrollWidth - rail.clientWidth;
      if (max > 0) {
        var left = Math.max(0, Math.min(max, btn.offsetLeft - (rail.clientWidth - btn.offsetWidth) / 2));
        if (smooth && !reduced()) rail.scrollTo({ left: left, behavior: "smooth" });
        else rail.scrollLeft = left;
      }
      railEdges();
    }
    rail.addEventListener("scroll", railEdges, { passive: true });

    /* The stage: change in place, with the frame held still */
    function showSurf(next) {
      if (next === shown) return;
      var from = surfs[shown];
      var to = surfs[next];
      shown = next;
      if (swapping) { swapping.cancel(); swapping = null; }
      surfs.forEach(function (s) { s.hidden = s !== from; });
      if (reduced() || !from.animate) { from.hidden = true; to.hidden = false; return; }
      var out = from.animate(
        [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(2px)" }],
        { duration: 100, easing: EASE_OUT, fill: "forwards" }
      );
      swapping = out;
      out.onfinish = function () {
        swapping = null;
        from.hidden = true;
        out.cancel();
        to.hidden = false;
        to.animate(
          [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }],
          { duration: 150, easing: EASE_OUT }
        );
      };
    }

    /* Pip's bar: an offer, then the dots and one live line per step, then
       what he did */
    function setMessage(text) {
      msg.classList.remove("is-busy");
      lineNode = null;
      setThinking(faceHolder, false);
      swapText(msg, text);
    }

    function setBusy(text) {
      setThinking(faceHolder, true);
      msg.textContent = "";
      msg.classList.add("is-busy");
      msg.appendChild(dots());
      lineNode = el("span", "", text);
      msg.appendChild(lineNode);
    }

    function step(text) { if (lineNode) swapText(lineNode, text); }

    function paint() {
      var j = JOBS[cur];
      jobBtns.forEach(function (b, i) {
        b.classList.toggle("is-on", i === cur);
        b.setAttribute("aria-pressed", i === cur ? "true" : "false");
        b.classList.toggle("is-done", done[i]);
      });
      railTo(jobBtns[cur], true);
      showSurf(cur);
      if (cur === 0) later(function () { note.classList.toggle("is-scrolled", note.scrollTop > 4); }, 120);
      swapText(title, j.title);
      if (!busy) setMessage(done[cur] ? j.done : j.intro);
      goBtn.textContent = j.go;
      goBtn.hidden = busy || done[cur];
      replayBtn.hidden = nextBtn.hidden = busy || !done[cur];
      nextLabel.textContent = cur === JOBS.length - 1 ? "Back to the first job" : "Next job";
    }

    function finish() {
      busy = false;
      done[cur] = true;
      paint();
      if (!nextBtn.hidden) nextBtn.focus({ preventScroll: true });
    }

    function play() {
      busy = true;
      paint();
      setBusy(JOBS[cur].steps[0]);
      if (reduced()) { END[cur](); finish(); return; }
      PLAY[cur]();
    }

    /* The bar holds room for its widest buttons and its longest message at
       this width, so nothing Pip says can make the window grow */
    var MSGS = [];
    JOBS.forEach(function (j) { MSGS.push(j.intro, j.done); MSGS.push.apply(MSGS, j.steps); });

    function fitBar() {
      actions.style.minWidth = "";
      msg.style.minHeight = "";
      if (getComputedStyle(bar).flexWrap === "nowrap" && getComputedStyle(bar).display === "flex") {
        var keep = [goBtn.hidden, replayBtn.hidden, nextBtn.hidden, goBtn.textContent, nextLabel.textContent];
        var w = 0;
        goBtn.hidden = false;
        replayBtn.hidden = nextBtn.hidden = true;
        JOBS.forEach(function (j) { goBtn.textContent = j.go; w = Math.max(w, actions.getBoundingClientRect().width); });
        goBtn.hidden = true;
        replayBtn.hidden = nextBtn.hidden = false;
        ["Next job", "Back to the first job"].forEach(function (t) { nextLabel.textContent = t; w = Math.max(w, actions.getBoundingClientRect().width); });
        goBtn.hidden = keep[0];
        replayBtn.hidden = keep[1];
        nextBtn.hidden = keep[2];
        goBtn.textContent = keep[3];
        nextLabel.textContent = keep[4];
        actions.style.minWidth = Math.ceil(w) + "px";
      }
      var probe = el("p", "pipbar-msg");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText = "position:absolute;left:0;top:0;visibility:hidden;min-height:0;width:" + msg.getBoundingClientRect().width + "px";
      msg.parentNode.appendChild(probe);
      var h = 0;
      MSGS.forEach(function (t) { probe.textContent = t; h = Math.max(h, probe.getBoundingClientRect().height); });
      probe.remove();
      msg.style.minHeight = Math.ceil(h) + "px";
      measureNote();
      railTo(jobBtns[cur], false);
    }

    /* ── 0 · The newsletter ─────────────────────────────────────────────────
       Pip writes it under the title, word by word. While a paragraph writes,
       the idea it comes from holds a wash; when it's written, that idea folds
       away, and "Some ideas" goes with the last of them. The note follows the
       writing point if it runs past the stage. */

    function topIn(node) {
      var y = 0;
      while (node && node !== note) { y += node.offsetTop; node = node.offsetParent; }
      return y;
    }

    function noteEnd() {
      var end = topIn(nlText) + nlText.offsetHeight;
      if (!ideasBox.hidden) end = Math.max(end, topIn(ideasBox) + ideasBox.offsetHeight);
      return end;
    }

    // Only a note longer than the stage gets the fade at its foot
    function measureNote() {
      note.classList.toggle("is-long", noteEnd() > note.clientHeight - 2);
    }

    // The ideas slide down as the newsletter grows above them, never jump
    function pushIdeas(before) {
      if (ideasBox.hidden) return;
      var d = before - topIn(ideasBox);
      if (d && ideasBox.animate) {
        ideasBox.animate([{ transform: "translateY(" + d + "px)" }, { transform: "none" }], { duration: 240, easing: EASE_OUT });
      }
    }

    function follow(caret, n) {
      measureNote();
      var view = note.clientHeight - 48;
      var caretTop = topIn(caret);
      var bottom = caretTop + caret.offsetHeight;
      NL_FROM[n].forEach(function (i) { if (!ideas[i].hidden) bottom = Math.max(bottom, topIn(ideas[i]) + ideas[i].offsetHeight); });
      var want = Math.min(bottom - view, caretTop - 16);
      if (want > note.scrollTop + 2) note.scrollTo({ top: want, behavior: "smooth" });
    }

    note.addEventListener("scroll", function () { note.classList.toggle("is-scrolled", note.scrollTop > 4); }, { passive: true });

    // An idea that's been written folds away; the last takes the heading with it
    function fold(lis) {
      var left = ideas.filter(function (li) { return !li.hidden && lis.indexOf(li) < 0; });
      var what = left.length ? lis : [ideasBox];
      what.forEach(function (node) {
        var h = node.offsetHeight;
        var anim = node.animate && node.animate(
          [{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0, paddingTop: "0px", paddingBottom: "0px" }],
          { duration: 300, easing: EASE_OUT }
        );
        var gone = function () { node.hidden = true; measureNote(); };
        if (anim) anim.onfinish = gone; else gone();
      });
    }

    function nlPara(n) {
      if (n >= NL.length) {
        if (note.classList.contains("is-long")) note.scrollTo({ top: note.scrollHeight, behavior: "smooth" });
        finish();
        return;
      }
      var src = NL_FROM[n].map(function (i) { return ideas[i]; });
      src.forEach(function (li) { li.classList.add("is-lit"); });
      var before = topIn(ideasBox);
      var p = el("p");
      var text = document.createTextNode("");
      var caret = el("span", "caret");
      caret.setAttribute("aria-hidden", "true");
      p.appendChild(text);
      p.appendChild(caret);
      nlText.appendChild(p);
      pushIdeas(before);
      var words = NL[n].split(" ");
      var k = 0;
      (function word() {
        var at = topIn(ideasBox);
        text.data += (k ? " " : "") + words[k++];
        pushIdeas(at);
        follow(caret, n);
        if (k < words.length) { later(word, WORD_MS); return; }
        if (src.length) fold(src);
        later(function () { caret.remove(); nlPara(n + 1); }, PARA_MS);
      })();
    }

    function nlPlay() {
      nlText.textContent = "";
      later(function () { nlPara(0); }, 200);
    }

    function nlEnd() {
      nlText.textContent = "";
      NL.forEach(function (t) { nlText.appendChild(el("p", "", t)); });
      ideas.forEach(function (li) { li.classList.remove("is-lit"); li.hidden = true; });
      ideasBox.hidden = true;
      note.scrollTop = 0;
      measureNote();
    }

    function nlUndo() {
      [ideasBox].concat(ideas).forEach(function (node) {
        if (node.getAnimations) node.getAnimations().forEach(function (a) { a.cancel(); });
        node.hidden = false;
      });
      nlText.textContent = "";
      ideas.forEach(function (li) { li.classList.remove("is-lit"); });
      note.scrollTop = 0;
      measureNote();
    }

    /* ── 1 · The product shot ───────────────────────────────────────────────
       One dim snapshot, three tools: crop it square (the notepad still in),
       paint a selection over what goes and fill it in, then brighten it, still
       on Jo's desk. Each tool lights as it works. */

    function tool(name) {
      tools.forEach(function (t) {
        if (t.classList.contains("is-active")) { t.classList.remove("is-active"); t.classList.add("is-done"); }
        if (name && t.getAttribute("data-tool") === name) t.classList.add("is-active");
      });
    }

    function photoPlay() {
      tool("crop");
      photo.classList.add("is-framing");
      later(function () { photo.classList.add("is-cropped"); }, 1000);
      later(function () { photo.classList.add("is-square"); photo.classList.remove("is-framing"); }, 1950);
      later(function () { step(JOBS[1].steps[1]); tool("remove"); photo.classList.add("is-selecting"); }, 2250);
      later(function () { photo.classList.add("is-filled"); }, 3650);
      later(function () { step(JOBS[1].steps[2]); tool("bright"); photo.classList.add("is-bright"); }, 4550);
      later(function () { photoEnd(); finish(); }, 5750);
    }

    function photoEnd() {
      photo.classList.remove("is-framing", "is-selecting");
      photo.classList.add("is-cropped", "is-square", "is-filled", "is-bright");
      tools.forEach(function (t) { t.classList.remove("is-active"); t.classList.add("is-done"); });
      frame.setAttribute("aria-label", PHOTO_AFTER);
    }

    function photoUndo() {
      PHOTO_STATES.forEach(function (c) { photo.classList.remove(c); });
      tools.forEach(function (t) { t.classList.remove("is-active", "is-done"); });
      frame.setAttribute("aria-label", PHOTO_BEFORE);
    }

    /* ── 2 · Spot an opportunity ────────────────────────────────────────────
       Pip reads down the drum bookings, checks each name against the lino
       ones (Ben and Chloe have done both), and saves the four left as a view
       of the same table. */

    function bkRow(who, kind) {
      return bkRows.filter(function (r) { return r.getAttribute("data-who") === who && r.getAttribute("data-w") === kind; })[0];
    }

    function bkPlay() {
      var drums = bkRows.filter(function (r) { return r.getAttribute("data-w") === "drum"; });
      drums.forEach(function (r, i) { later(function () { r.classList.add("is-lit"); }, 250 + i * 340); });
      var t = 250 + drums.length * 340 + 260;
      later(function () { step(JOBS[2].steps[1]); }, t);
      ["ben", "chloe"].forEach(function (who, i) {
        var lino = bkRow(who, "lino");
        var drum = bkRow(who, "drum");
        later(function () { lino.classList.add("is-lit"); }, t + 250 + i * 950);
        later(function () {
          lino.classList.remove("is-lit");
          drum.classList.remove("is-lit");
          drum.classList.add("is-out");
        }, t + 850 + i * 950);
      });
      t += 2150;
      later(function () { step(JOBS[2].steps[2]); bk.classList.add("is-saved"); }, t);
      later(function () { bk.classList.add("is-view"); }, t + 520);
      later(finish, t + 1300);
    }

    function bkEnd() {
      bkRows.forEach(function (r) {
        var drum = r.getAttribute("data-w") === "drum";
        var out = drum && !!r.getAttribute("data-who");
        r.classList.toggle("is-lit", drum && !out);
        r.classList.toggle("is-out", out);
      });
      bk.classList.add("is-saved", "is-view");
    }

    function bkUndo() {
      bkRows.forEach(function (r) { r.classList.remove("is-lit", "is-out"); });
      bk.classList.remove("is-saved", "is-view");
    }

    /* ── 3 · The deck ───────────────────────────────────────────────────────
       A slide is dealt for each step, and on a laptop the step it came from
       lights as it lands (the cover answers to the note's title). On a phone
       the note steps aside first and the slides take its place. */

    function deckPlay() {
      deck.classList.add("is-dealing");
      slideEls.forEach(function (s, i) {
        later(function () {
          s.classList.add("is-dealt");
          lit(stepLines[i], 760);
        }, 380 + i * 520);
      });
      later(finish, 380 + slideEls.length * 520 + 480);
    }

    function deckEnd() {
      deck.classList.add("is-dealing");
      slideEls.forEach(function (s) { s.classList.add("is-dealt"); });
      stepLines.forEach(function (l) { l.classList.remove("is-lit"); });
    }

    function deckUndo() {
      deck.classList.remove("is-dealing");
      slideEls.forEach(function (s) { s.classList.remove("is-dealt"); });
      stepLines.forEach(function (l) { l.classList.remove("is-lit"); });
    }

    /* ── 4 · The collection ─────────────────────────────────────────────────
       The ideas regroup into fabrics, shapes and notes; then Pip reads the
       scallop prices and pencils in the one that's missing, in place. */

    function cvPlay() {
      cv.classList.add("is-sorted");
      later(function () { step(JOBS[4].steps[1]); cvPrices.classList.add("is-lit"); }, 1900);
      later(function () { cvPrices.classList.remove("is-lit"); cvPrice.classList.add("is-lit"); }, 2800);
      later(function () { swapText(cvPriceText, PRICE_AFTER); }, 3250);
      later(function () { cvPrice.classList.remove("is-lit"); finish(); }, 4300);
    }

    function cvEnd() {
      cv.classList.add("is-sorted");
      cvPrices.classList.remove("is-lit");
      cvPrice.classList.remove("is-lit");
      cvPriceText.textContent = PRICE_AFTER;
    }

    function cvUndo() {
      cv.classList.remove("is-sorted");
      cvPrices.classList.remove("is-lit");
      cvPrice.classList.remove("is-lit");
      cvPriceText.textContent = PRICE_BEFORE;
    }

    /* ── 5 · The year ───────────────────────────────────────────────────────
       The sheet becomes a dashboard: totals that count up, a chart that
       grows, and the one finding. */

    function countUp(nodes, duration) {
      var t0 = null;
      function frameFn(ts) {
        if (t0 === null) t0 = ts;
        var k = reduced() ? 1 : Math.min(1, (ts - t0) / duration);
        var eased = 1 - Math.pow(1 - k, 3);
        nodes.forEach(function (b) {
          b.textContent = (b.getAttribute("data-pre") || "") + Math.round(+b.getAttribute("data-to") * eased).toLocaleString("en-GB") + (b.getAttribute("data-suf") || "");
        });
        if (k < 1) requestAnimationFrame(frameFn);
      }
      requestAnimationFrame(frameFn);
    }

    function setTiles(final) {
      tiles.forEach(function (b) {
        b.textContent = (b.getAttribute("data-pre") || "") + (final ? (+b.getAttribute("data-to")).toLocaleString("en-GB") : "0") + (b.getAttribute("data-suf") || "");
      });
    }

    function dashPlay() {
      later(function () { step(JOBS[5].steps[1]); dash.classList.add("is-shown"); countUp(tiles, 1500); }, 1000);
      later(function () { step(JOBS[5].steps[2]); chart.classList.add("is-grown"); }, 2000);
      later(function () { step(JOBS[5].steps[3]); }, 3200);
      later(finish, 4200);
    }

    function dashEnd() {
      dash.classList.add("is-shown");
      chart.classList.add("is-grown");
      setTiles(true);
    }

    function dashUndo() {
      dash.classList.remove("is-shown");
      chart.classList.remove("is-grown");
      setTiles(false);
    }

    var PLAY = [nlPlay, photoPlay, bkPlay, deckPlay, cvPlay, dashPlay];
    var END = [nlEnd, photoEnd, bkEnd, deckEnd, cvEnd, dashEnd];
    var UNDO = [nlUndo, photoUndo, bkUndo, deckUndo, cvUndo, dashUndo];

    goBtn.addEventListener("click", function () {
      if (busy || done[cur]) return;
      play();
    });
    // Replay: the before, back at once, then the job again on its own
    replayBtn.addEventListener("click", function () {
      if (busy) return;
      instantly(UNDO[cur]);
      done[cur] = false;
      busy = true;
      paint();
      setBusy(JOBS[cur].steps[0]);
      bringIntoView();
      later(function () {
        if (reduced()) { END[cur](); finish(); return; }
        PLAY[cur]();
      }, 520);
    });
    nextBtn.addEventListener("click", function () {
      if (busy) return;
      cur = (cur + 1) % JOBS.length;
      paint();
      bringIntoView();
      if (!goBtn.hidden) goBtn.focus({ preventScroll: true });
    });
    jobBtns.forEach(function (b, i) {
      b.addEventListener("click", function () {
        if (busy || i === cur) return;
        cur = i;
        paint();
        bringIntoView();
      });
    });

    paint();
    fitBar();
    var lastW = win.getBoundingClientRect().width;
    var queued = false;
    function refit() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; fitBar(); });
    }
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () {
        var w = win.getBoundingClientRect().width;
        if (w === lastW) return;
        lastW = w;
        refit();
      }).observe(win);
    }
    window.addEventListener("resize", refit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBar);
  }


  /* ── flow ──────────────────────────────────────────────────────────────────
     From a few ideas to a month of posts: one whole job in four steps, which
     the visitor drives. A step button jumps straight to that step as it ends
     (step 4 already filled in). Next step plays the move into the next one:
     the question types into the chat box and Pip reads the note and answers
     (2); the plan arrives as a table, the columns Pip added washed coral (3);
     Pip writes each caption and picks each photo, row by row (4). On the last
     step Next step becomes Start again. CSS holds the demo at one height; Pip's
     line keeps the height of its tallest message for the panel on screen, and
     the table shows as many whole rows as fit, the next fading under "N more".
     The dates are next month's Mondays, Wednesdays and Fridays. Under reduced
     motion each step is simply its end state. */

  function flow() {
    var root = $("#flow-demo");
    if (!root) return;
    var wrap = root.parentNode;
    var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var TOTAL = 12; // three posts a week, four weeks

    // Next month's first twelve Mondays, Wednesdays and Fridays
    var first = new Date();
    first.setHours(12, 0, 0, 0);
    first.setDate(1);
    first.setMonth(first.getMonth() + 1);
    var month = MONTHS[first.getMonth()];
    var slots = [];
    for (var d = new Date(first); d.getMonth() === first.getMonth() && slots.length < TOTAL; d.setDate(d.getDate() + 1)) {
      var wd = d.getDay();
      if (wd === 1 || wd === 3 || wd === 5) slots.push(DAYS[wd] + " " + d.getDate());
    }
    $$("[data-flow-day]", root).forEach(function (n) {
      var s = slots[+n.getAttribute("data-flow-day")];
      if (s) n.textContent = s;
    });
    $$("[data-flow-month]", root).forEach(function (n) { n.textContent = month; });

    var LINES = [
      "Got some ideas down? Ask me to turn them into a plan.",
      "Just ask, in your own words. I'll read your note first.",
      "Want me to write the captions in your voice and pick photos from your folders?",
      "Done. Twelve posts for " + month + ", in your voice. Change anything you like."
    ];
    var WORKING = "Writing captions and picking photos…";

    var stepBtns = $$("[data-flow-to]", root);
    var stepsRow = $("[data-flow-steps]", root);
    var nextBtn = $("[data-flow-next]", root);
    var nextLabel = $("[data-flow-next-label]", root);
    var nextUse = $("use", nextBtn);
    var pip = $("[data-flow-pip]", root);
    var msg = $("[data-flow-msg]", root);
    var faceHolder = $("[data-flow-face]", root);
    var fillBtn = $("[data-flow-fill]", root);
    var panelA = $('[data-flow-panel="a"]', root);
    var panelB = $('[data-flow-panel="b"]', root);
    var note = $("[data-flow-note]", root);
    var ideas = $$(".flow-rough li", root);
    var chat = $("[data-flow-chat]", root);
    var said = $$("[data-step]", chat); // the question, then Pip's answer
    var box = composer(chat);
    var grid = $(".flow-grid", panelB);
    var table = $("[data-flow-table]", panelB);
    var head = $(".flow-th", panelB);
    var rows = $$(".flow-tr:not(.flow-th)", panelB);
    var caps = rows.map(function (r) { return $(".c-cap", r); });
    var CAPS = caps.map(function (c) { return c.textContent; });
    var photos = rows.map(function (r) { return $(".c-ph", r); });
    var more = $("[data-flow-more]", panelB);

    var at = 0, run = 0, busy = false, shown = 6, swapping = null;
    var pipH = [0, 0]; // Pip's line at its tallest: for the note and chat, and for the table

    table.setAttribute("aria-label", month + " posts");
    [head].concat(rows).forEach(function (r, i) { r.style.setProperty("--n", i); });
    root.classList.add("is-ready");
    wrap.classList.add("is-ready");

    function instantly(fn) {
      root.classList.add("is-instant");
      fn();
      void root.offsetWidth;
      root.classList.remove("is-instant");
    }

    function tried() { root.classList.add("is-tried"); }

    // A phone shows the note and the chat in turn, not side by side
    function oneAtATime() { return getComputedStyle(note).display === "none" || getComputedStyle(chat).display === "none"; }

    function fadeIn(node) {
      if (reduced() || !node.animate) return;
      node.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 150, easing: EASE_OUT });
    }

    /* The whole demo in view, under the sticky header, with a little air */
    function intoView() {
      var r = root.getBoundingClientRect();
      var top = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 0) + 12;
      if (r.top >= top - 1 && r.bottom <= window.innerHeight - 11) return;
      window.scrollTo({ top: Math.round(window.scrollY + r.top - top), behavior: reduced() ? "auto" : "smooth" });
    }

    /* On a narrow demo the steps are one sideways row: keep the current one in
       view and fade the edge that has more */
    function stepsEdges() {
      var max = stepsRow.scrollWidth - stepsRow.clientWidth;
      stepsRow.classList.toggle("is-scrolled", stepsRow.scrollLeft > 2);
      stepsRow.classList.toggle("is-at-end", stepsRow.scrollLeft >= max - 2);
    }
    function stepsTo(btn, smooth) {
      var max = stepsRow.scrollWidth - stepsRow.clientWidth;
      if (max > 0) {
        var r = stepsRow.getBoundingClientRect(), b = btn.getBoundingClientRect();
        var left = Math.max(0, Math.min(max, stepsRow.scrollLeft + b.left - r.left - (r.width - b.width) / 2));
        if (smooth && !reduced() && stepsRow.scrollTo) stepsRow.scrollTo({ left: left, behavior: "smooth" });
        else stepsRow.scrollLeft = left;
      }
      stepsEdges();
    }
    stepsRow.addEventListener("scroll", stepsEdges, { passive: true });

    /* The chat: empty (step 1), or the question and Pip's answer (step 2) */
    function chatTo(answered) {
      said.forEach(function (s) { s.classList.remove("is-shown", "is-thinking", "is-answered"); });
      chat.classList.toggle("is-pre", !answered);
      box.reset();
      ideas.forEach(function (li) { li.classList.remove("is-lit"); });
    }

    /* The table: its gaps (step 3), or filled in (step 4) */
    function tableTo(filled) {
      rows.forEach(function (r, i) {
        r.classList.remove("is-filling");
        caps[i].textContent = filled ? CAPS[i] : "";
        photos[i].classList.toggle("is-empty", !filled);
      });
      panelB.classList.remove("is-arriving");
    }

    /* As many whole rows as the table's room takes, then "N more" */
    function fitRows() {
      if (panelB.hidden) return;
      var cs = getComputedStyle(panelB);
      var rowH = parseFloat(cs.getPropertyValue("--row-h")) || 56;
      var headH = parseFloat(cs.getPropertyValue("--head-h")) || 36;
      var ghostH = parseFloat(cs.getPropertyValue("--ghost-h")) || 30;
      shown = Math.max(1, Math.min(6, Math.floor((grid.clientHeight - headH - ghostH - 2) / rowH)));
      root.style.setProperty("--flow-rows", shown);
      more.textContent = (TOTAL - shown) + " more";
    }

    /* Change panel in place: the old leaves in 100ms, the new arrives in 150ms */
    function showPanel(n, animate) {
      var to = n < 2 ? panelA : panelB;
      var from = to === panelA ? panelB : panelA;
      if (swapping) { swapping.cancel(); swapping = null; }
      if (from.hidden) { to.hidden = false; fitRows(); return; }
      if (!animate || reduced() || !from.animate) { from.hidden = true; to.hidden = false; fitRows(); return; }
      var out = from.animate(
        [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(2px)" }],
        { duration: 100, easing: EASE_OUT, fill: "forwards" }
      );
      swapping = out;
      out.onfinish = function () {
        swapping = null;
        from.hidden = true;
        out.cancel();
        to.hidden = false;
        fitRows();
        to.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 150, easing: EASE_OUT });
      };
    }

    /* Pip's line: what Pip says at a step, or the dots and what Pip's doing */
    function setPip(n) {
      msg.classList.remove("is-busy");
      setThinking(faceHolder, false);
      swapText(msg, LINES[n]);
      fillBtn.hidden = n !== 2;
      pip.style.minHeight = pipH[n < 2 ? 0 : 1] + "px";
    }
    function setBusy(text) {
      setThinking(faceHolder, true);
      fillBtn.hidden = true;
      msg.textContent = "";
      msg.classList.add("is-busy");
      msg.appendChild(dots());
      msg.appendChild(el("span", "", text));
    }

    // The tallest thing Pip's line says on each panel, at this width
    function fitPip() {
      var probe = pip.cloneNode(true);
      probe.removeAttribute("data-flow-pip");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText = "position:absolute;left:0;top:0;visibility:hidden;min-height:0;width:" + pip.getBoundingClientRect().width + "px";
      var pm = $(".flow-msg", probe), pb = $(".flow-fill", probe);
      pm.removeAttribute("aria-live");
      root.appendChild(probe);
      function h(text, withButton, working) {
        pm.className = "flow-msg";
        pm.textContent = "";
        if (working) { pm.classList.add("is-busy"); pm.appendChild(dots()); pm.appendChild(el("span", "", text)); }
        else pm.textContent = text;
        pb.hidden = !withButton;
        return probe.getBoundingClientRect().height;
      }
      pipH[0] = Math.ceil(Math.max(h(LINES[0]), h(LINES[1])));
      pipH[1] = Math.ceil(Math.max(h(LINES[2], true), h(WORKING, false, true), h(LINES[3])));
      probe.remove();
      pip.style.minHeight = pipH[at < 2 ? 0 : 1] + "px";
    }

    /* The strip: which step is on, and what Next step will do */
    function paint(n) {
      at = n;
      [0, 1, 2, 3].forEach(function (i) { root.classList.toggle("is-at-" + i, i === n); });
      stepBtns.forEach(function (b, i) { b.setAttribute("aria-pressed", i === n ? "true" : "false"); });
      nextLabel.textContent = n === 3 ? "Start again" : "Next step";
      nextUse.setAttribute("href", n === 3 ? "#i-rotate" : "#i-arrow-right");
      stepsTo(stepBtns[n], true);
    }

    /* Straight to a step, as it ends */
    function jump(n) {
      var was = at;
      run++;
      busy = false;
      paint(n);
      instantly(function () {
        chatTo(n >= 1);
        tableTo(n === 3);
      });
      showPanel(n, true);
      if (n < 2 && was < 2 && was !== n && oneAtATime()) fadeIn(n === 0 ? note : chat);
      setPip(n);
    }

    function sleeper(id) {
      return function (ms) {
        return new Promise(function (resolve, reject) {
          setTimeout(function () { if (id === run) resolve(); else reject(CANCELLED); }, ms);
        });
      };
    }

    /* 1 → 2: the question types into the chat box and goes; Pip reads the
       note, each idea washing in turn, and answers */
    function playAsk(sleep) {
      var q = said[0], a = said[1];
      paint(1);
      instantly(function () { chatTo(false); tableTo(false); });
      showPanel(1, true);
      if (oneAtATime()) fadeIn(chat);
      setPip(1);
      var i = 0;
      function read() {
        if (i >= ideas.length) return sleep(420);
        ideas[i++].classList.add("is-lit");
        return sleep(260).then(read);
      }
      return sleep(450)
        .then(function () { return box.type(q.textContent, sleep); })
        .then(function () { return sleep(380); })
        .then(function () { box.send(); q.classList.add("is-shown"); return sleep(520); })
        .then(function () { a.classList.add("is-shown", "is-thinking"); setThinking(faceHolder, true); return sleep(300); })
        .then(read)
        .then(function () {
          a.classList.remove("is-thinking");
          a.classList.add("is-answered");
          ideas.forEach(function (li) { li.classList.remove("is-lit"); });
          setThinking(faceHolder, false);
        });
    }

    /* 2 → 3: the plan arrives as a table, row by row, then the wash lands on
       the columns Pip added */
    function playPlan(sleep) {
      paint(2);
      instantly(function () { tableTo(false); });
      void panelB.offsetWidth;
      panelB.classList.add("is-arriving");
      showPanel(2, true);
      setPip(2);
      return sleep(1400).then(function () { panelB.classList.remove("is-arriving"); });
    }

    /* 3 → 4: each caption written into its row, then its photo, row by row.
       The faded row and those out of sight are filled at once. */
    function playFill(sleep) {
      paint(3);
      instantly(function () { tableTo(false); });
      showPanel(3, false);
      setBusy(WORKING);
      pip.style.minHeight = pipH[1] + "px";
      var upto = Math.min(rows.length, shown);
      rows.forEach(function (r, i) {
        if (i < upto) return;
        caps[i].textContent = CAPS[i];
        photos[i].classList.remove("is-empty");
      });
      function fillRow(i) {
        if (i >= upto) return sleep(260);
        var words = CAPS[i].split(" "), k = 0;
        function word() {
          if (k >= words.length) return Promise.resolve();
          k += 1;
          caps[i].textContent = words.slice(0, k).join(" ");
          return sleep(34).then(word);
        }
        rows[i].classList.add("is-filling");
        return sleep(110)
          .then(word)
          .then(function () { return sleep(110); })
          .then(function () { photos[i].classList.remove("is-empty"); return sleep(240); })
          .then(function () { rows[i].classList.remove("is-filling"); return fillRow(i + 1); });
      }
      return sleep(420)
        .then(function () { return fillRow(0); })
        .then(function () { setPip(3); });
    }

    function play(n) {
      if (reduced()) { jump(n); return; }
      var id = ++run;
      var sleep = sleeper(id);
      busy = true;
      var moves = [null, playAsk, playPlan, playFill];
      moves[n](sleep)
        .then(function () { if (id === run) busy = false; })
        .catch(function (err) { if (err !== CANCELLED) throw err; });
    }

    stepBtns.forEach(function (b, i) {
      b.addEventListener("click", function () {
        tried();
        if (i === at && !busy) return;
        jump(i);
        intoView();
      });
    });
    nextBtn.addEventListener("click", function () {
      tried();
      var n = at;
      if (busy) jump(n); // finish this step at once, then move on
      if (n === 3) jump(0); else play(n + 1);
      intoView();
    });
    fillBtn.addEventListener("click", function () {
      tried();
      if (at !== 2) return;
      nextBtn.focus({ preventScroll: true });
      play(3);
      intoView();
    });

    // Warm the photos before anyone asks for them
    onceVisible(wrap, function () {
      photos.forEach(function (p) { var img = $("img", p); if (img) { var pre = new Image(); pre.src = img.currentSrc || img.src; } });
    }, 0);

    panelB.hidden = true;
    paint(0);
    instantly(function () { chatTo(false); tableTo(false); });
    setPip(0);
    fitPip();

    var queued = false;
    function refit() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        fitPip();
        fitRows();
        stepsTo(stepBtns[at], false);
      });
    }
    window.addEventListener("resize", refit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
  }


  /* ── accordion ─────────────────────────────────────────────────────────────
     Native <details>, so every answer works without JavaScript. With it, an
     answer opens with height and fade over 220ms and closes in 160ms
     (leaving is faster than arriving). A link to #q-… opens that answer. */

  function accordion() {
    var items = $$(".acc-item");
    if (!items.length) return;

    items.forEach(function (item) {
      var summary = $("summary", item);
      var body = $(".acc-a", item);
      var anim = null;

      summary.addEventListener("click", function (e) {
        if (reduced() || !body.animate) return; // the native toggle is the reduced-motion path
        e.preventDefault();
        if (anim) { anim.cancel(); anim = null; }
        if (!item.open || item.classList.contains("is-closing")) {
          item.classList.remove("is-closing");
          item.open = true;
          var h = body.scrollHeight;
          anim = body.animate(
            [{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }],
            { duration: 220, easing: EASE_OUT }
          );
          anim.onfinish = function () { anim = null; };
        } else {
          item.classList.add("is-closing");
          anim = body.animate(
            [{ height: body.offsetHeight + "px", opacity: 1 }, { height: "0px", opacity: 0 }],
            { duration: 160, easing: EASE_OUT, fill: "forwards" }
          );
          anim.onfinish = function () {
            item.open = false;
            item.classList.remove("is-closing");
            if (anim) anim.cancel();
            anim = null;
          };
        }
      });
    });

    function openFromHash() {
      var id = decodeURIComponent((location.hash || "").slice(1));
      var target = id && document.getElementById(id);
      if (target && target.tagName === "DETAILS") target.open = true;
    }
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
  }

  /* ── jumpList ──────────────────────────────────────────────────────────────
     The questions page's list of groups stays beside the answers and marks
     the group you are reading with a small coral dot. */

  function jumpList() {
    var nav = $("[data-jump]");
    if (!nav) return;
    var links = $$("a", nav);
    var groups = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });

    function mark(i) {
      links.forEach(function (a, k) {
        if (k === i) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
    }
    mark(0);
    if (!("IntersectionObserver" in window)) return;

    var visible = groups.map(function () { return false; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { visible[groups.indexOf(entry.target)] = entry.isIntersecting; });
      var first = visible.indexOf(true);
      if (first >= 0) mark(first);
    }, { rootMargin: "-30% 0px -55% 0px" });
    groups.forEach(function (g) { if (g) io.observe(g); });
  }

  /* ── signup ────────────────────────────────────────────────────────────────
     "Download for Mac" leads here while Pip opens to its first 50 people: a
     name, an email and, if they like, what they do. It goes to Pip's own
     database in the EU (an insert-only table; the key is the public one the
     app ships with). Nothing is pretended: if it can't be saved, the form
     says so and offers Hayden's email instead. A hidden field catches bots. */

  var CONTACT = "hello@haydenslaughter.co.uk";

  function signup() {
    var root = $("[data-signup]");
    if (!root) return;
    var form = $("[data-signup-form]", root);
    var done = $("[data-signup-done]", root);
    var error = $("[data-signup-error]", root);
    var btn = $("[data-signup-btn]", root);
    var thanks = $("[data-signup-thanks]", root);
    var next = $("[data-signup-next]", root);
    var endpoint = form.getAttribute("data-endpoint");
    var key = form.getAttribute("data-key");
    var busy = false;
    // form.name is the form's own name, so reach the fields through elements
    var f = function (n) { return form.elements.namedItem(n); };

    function fail(text, withEmail) {
      error.textContent = text;
      if (withEmail) {
        error.appendChild(document.createTextNode(" "));
        var a = el("a", "", CONTACT);
        a.href = "mailto:" + CONTACT;
        error.appendChild(a);
        error.appendChild(document.createTextNode(" and I'll add you myself."));
      }
      error.hidden = false;
    }
    function finish(name, email) {
      var first = name.split(/\s+/)[0];
      thanks.textContent = "Thanks, " + first + ". You're on the list.";
      next.textContent = "I'll email you at " + email + " when your place is ready. Keep an eye out for an email from Hayden at Pip.";
      form.hidden = true;
      done.hidden = false;
      done.focus({ preventScroll: true });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy) return;
      error.hidden = true;
      var name = f("name").value.trim();
      var email = f("email").value.trim();
      var about = f("about").value.trim();
      f("name").setAttribute("aria-invalid", name ? "false" : "true");
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      f("email").setAttribute("aria-invalid", emailOk ? "false" : "true");
      if (!name) { fail("Please add your name."); f("name").focus(); return; }
      if (!emailOk) { fail("That email doesn't look quite right."); f("email").focus(); return; }
      if (f("website").value) { finish(name, email); return; } // a bot filled the hidden field
      if (!endpoint || !window.fetch) { fail("Sorry, sign-ups aren't working here yet. Email me at", true); return; }
      busy = true;
      btn.setAttribute("aria-busy", "true");
      btn.textContent = "Saving…";
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: key, Prefer: "return=minimal" },
        body: JSON.stringify({ name: name, email: email, about: about || null, source: "website" })
      }).then(function (r) {
        // 409: they're already on the list, which is fine
        if (r.ok || r.status === 409) finish(name, email);
        else fail("Sorry, that didn't save. Try again, or email me at", true);
      }, function () {
        fail("Sorry, that didn't send. Check your connection and try again, or email me at", true);
      }).then(function () {
        busy = false;
        btn.removeAttribute("aria-busy");
        btn.textContent = "Save my place";
      });
    });
  }


  /* ── start ─────────────────────────────────────────────────────────────────
     Each module runs on its own, so one failing never stops the rest.
     PIP_READY tells the inline guard in <head> that reveals are handled. */

  [dates, stops, header, mascots, reveal, scenes, takeover, playground, jobs, flow, accordion, jumpList, signup].forEach(function (init) {
    try { init(); } catch (err) {
      if (window.console && console.error) console.error("pip site:", err);
    }
  });
  window.PIP_READY = true;
})();
