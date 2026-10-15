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
     jobs       six files, and Pip in each (Pip on your page)
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

  /* ── page top ──────────────────────────────────────────────────────────────
     A page opened from the menu or a link starts at its top, even where the
     browser (or a frame the site is shown in) would carry the last scroll
     position over. Back, forward and reload keep theirs; a link to
     #a-section goes there. */
  function pageTop() {
    if (location.hash) return;
    var nav = window.performance && performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    if (nav && (nav.type === "back_forward" || nav.type === "reload")) return;
    var moved = false;
    function mark() { moved = true; }
    ["wheel", "touchstart", "keydown"].forEach(function (t) { window.addEventListener(t, mark, { passive: true, once: true }); });
    function top() { if (!moved && window.scrollY > 0) window.scrollTo(0, 0); }
    top();
    window.addEventListener("load", function () { top(); setTimeout(top, 60); });
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

  /* Never lose your work again: the same search in a chat app and in Pip.
     Pip's box is a real search box: type anything, or pick one of the three
     suggestions under it, which types itself into both boxes. The chat app answers with a
     long list of chats that all look alike; Pip opens the one folder and
     lights up the files that match. */
  function findDemo() {
    var root = $("[data-find]");
    if (!root) return;
    var chatQ = $("[data-find-q]", root);
    var input = $("[data-find-input]", root);
    var chatCount = $("[data-chat-count]", root);
    var chatList = $("[data-chat-list]", root);
    var pipCount = $("[data-pip-count]", root);
    var rows = $$("[data-find-tree] .tree-row", root);
    var btns = $$(".find-sug[data-q]", root);
    var R = runner();
    var M = D.month, P = D.monthPrev;
    var SEARCHES = [
      { q: M.toLowerCase() + " newsletter", word: "newsletter",
        chats: [M + " newsletter ideas", "Newsletter draft, make it warmer", "Rewrite the newsletter intro", M + " newsletter v2", "newsletter subject lines??", "Help with my newsletter", "Newsletter for " + M + " FINAL", "newsletter again", P + " newsletter", "Can you check this newsletter"],
        chatCount: "14 chats mention “newsletter”. Which one was the final?",
        pip: ["Newsletters/this-month"], pipCount: "1 note, in Newsletters" },
      { q: "drum workshop", word: "workshop",
        chats: ["Workshop slides?", "Drum workshop steps help", "Make my workshop instructions clearer", "workshop email to everyone", "Workshop prices", "Rewrite the workshop description", "drum workshop again", "Workshop booking list", "Workshop photos caption"],
        chatCount: "11 chats mention “workshop”. Where are the slides?",
        pip: ["Workshops/Drum workshop steps", "Workshops/Drum workshop slides", "Workshops/Bookings"], pipCount: "3 files, all in Workshops: a note, slides and a table" },
      { q: "sales", word: "sales",
        chats: ["Sales figures for " + P, "Can you add up these sales", "sales again", "Make a chart of my sales", "Which month sold best?", "Sales summary for the accountant", "sales " + D.salesYear, "Help with my sales sheet"],
        chatCount: "9 chats mention “sales”. Which numbers are up to date?",
        pip: ["Sales/table", "Sales/Sales dashboard"], pipCount: "2 files, in Sales: the table and its dashboard" }
    ];
    function marked(text, word) {
      var frag = document.createDocumentFragment();
      var re = new RegExp("(" + word + ")", "i");
      text.split(re).forEach(function (part, k) {
        if (!part) return;
        frag.appendChild(k % 2 === 1 ? el("mark", "", part) : document.createTextNode(part));
      });
      return frag;
    }
    var STOP = /^(the|a|an|my|our|this|that|these|those|year's|years|of|for|and|to|in|on|with|about)$/;
    function words(q) {
      return q.toLowerCase().replace(/[^a-z0-9£' ]/g, " ").split(/\s+/).filter(function (w) { return w.length > 2 && !STOP.test(w); });
    }
    function cap(w) { return w.charAt(0).toUpperCase() + w.slice(1); }
    // Any words: one of the three if they point at it, else the same story
    // told with the visitor's own word
    function searchFor(q) {
      var ws = words(q);
      if (!ws.length) return null;
      for (var k = 0; k < SEARCHES.length; k++) {
        if (ws.indexOf(SEARCHES[k].word) > -1 || (k === 1 && ws.indexOf("drum") > -1)) return SEARCHES[k];
      }
      var w = ws.slice().sort(function (a, b) { return b.length - a.length; })[0];
      var hits = [], folders = [];
      rows.forEach(function (row) {
        var node = row.getAttribute("data-node");
        if (!node) return;
        // the file's name, its folder, and a few words for what's inside it
        var hay = (row.textContent + " " + (row.getAttribute("data-in") || "") + " " + (row.getAttribute("data-about") || "")).toLowerCase();
        if (ws.some(function (x) { return hay.indexOf(x) > -1; })) {
          hits.push(node);
          var f = row.getAttribute("data-in");
          if (folders.indexOf(f) < 0) folders.push(f);
        }
      });
      var n = 6 + (w.length % 7);
      return {
        word: w,
        chats: [cap(w) + " ideas", "Help with my " + w, w + " again", "Rewrite the " + w + " bit", cap(w) + ", but shorter", w + " v2", "Can you check my " + w + "?", cap(w) + " FINAL"],
        chatCount: n + " chats mention “" + w + "”. Which one was it?",
        pip: hits,
        pipCount: hits.length ? hits.length + (hits.length === 1 ? " file, in " : " files, in ") + folders.join(" and ") : "Nothing matches that in this sample. In Pip, every file sits in a folder you can see."
      };
    }
    function show(S, animate) {
      chatList.textContent = "";
      S.chats.forEach(function (t, i) {
        var li = el("li", "fchat" + (animate ? " is-new" : ""));
        li.appendChild(icon("message", 14));
        var span = el("span"); span.appendChild(marked(t, S.word)); li.appendChild(span);
        if (animate) li.style.setProperty("--n", i);
        chatList.appendChild(li);
      });
      chatCount.textContent = S.chatCount;
      pipCount.textContent = S.pipCount;
      var near = S.pip.map(function (n) { return n.split("/")[0]; });
      root.classList.add("is-found");
      rows.forEach(function (row) {
        var node = row.getAttribute("data-node"), f = row.getAttribute("data-folder") || row.getAttribute("data-in");
        row.classList.toggle("is-selected", !!node && S.pip.indexOf(node) > -1);
        row.classList.toggle("is-near", near.indexOf(f) > -1);
      });
    }
    function search(q, animate) {
      var S = searchFor(q);
      if (q.trim()) chatQ.textContent = q;
      else chatQ.innerHTML = '<span class="find-ph">Search your chats</span>';
      if (!S) { root.classList.remove("is-found"); return; }
      show(S, animate);
    }
    function pressed(k) { btns.forEach(function (b, i) { b.setAttribute("aria-pressed", i === k ? "true" : "false"); }); }
    // A suggestion types itself into both boxes, then both sides answer
    function suggest(k) {
      var q = SEARCHES[k].q;
      pressed(k);
      var sleep = R.start();
      if (reduced()) { input.value = q; search(q, false); return; }
      input.value = ""; chatQ.textContent = "";
      root.classList.add("is-typing");
      var i = 0;
      (function key() {
        i++;
        input.value = q.slice(0, i);
        chatQ.textContent = q.slice(0, i);
        if (i < q.length) return sleep(q.charAt(i - 1) === " " ? 70 : 45).then(key).catch(quietly);
        root.classList.remove("is-typing");
        sleep(260).then(function () { show(SEARCHES[k], true); }).catch(quietly);
      })();
    }
    btns.forEach(function (btn, k) { btn.addEventListener("click", function () { root.classList.add("is-tried"); suggest(k); }); });
    var typed = null;
    input.addEventListener("input", function () {
      R.cancel();
      pressed(-1);
      root.classList.add("is-tried");
      root.classList.remove("is-typing");
      clearTimeout(typed);
      chatQ.textContent = input.value;
      typed = setTimeout(function () { search(input.value, true); }, 250);
    });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); clearTimeout(typed); search(input.value, true); } });
    // The first time it's well on screen, the first suggestion plays
    if (!reduced()) onceVisible(root, function () { setTimeout(function () { if (!root.classList.contains("is-tried")) suggest(0); }, 600); }, 0.45);
  }

  /* ── Pip on your page ───────────────────────────────────────────────────────
     The one pattern every demo uses, as in the app: your file in the middle
     (you can write in it), Pip's face in its corner, and Pip's pop-over
     rising from the face with "How Pip can help". Pip changes only what you
     pick, underlined as Pip's edit, with Undo, until you change it and it's
     yours. The four steps above the stage light up as the visitor does each
     thing. A play-through runs once, the first time the stage is well on
     screen; any click in the stage takes over. Each demo brings its own
     moves and what they do; this is the chrome they share. */
  function pipPage(root, opts) {
    opts = opts || {};
    var face = $("[data-pp-face]", root);
    var pop = $("[data-pp-pop]", root);
    var doc = $("[data-pp-doc]", root);
    var says = $("[data-pp-says]", root);
    var saysText = $("[data-pp-says-text]", root);
    var undoBtn = $("[data-pp-undo]", root);
    var hintEl = $("[data-pp-hint]", root);
    var pointer = $("[data-pp-pointer]", root);
    var replay = $("[data-pp-replay]", root);
    var compose = $("[data-pp-compose]", root);
    var scopes = $$("[data-pp-scope]", root);
    var steps = $$("[data-pp-steps] li", root.parentNode);
    var moves = $$("[data-move]", root);
    var api = { root: root, doc: doc, face: face, pop: pop, auto: false };
    var HINT = hintEl ? hintEl.innerHTML : "";

    api.step = function (n) { steps.forEach(function (li, i) { if (i < n) li.classList.add("is-on"); }); };
    api.resetSteps = function () { steps.forEach(function (li) { li.classList.remove("is-on"); }); };
    api.hint = function (html) { if (!hintEl) return; hintEl.innerHTML = html == null ? HINT : html; hintEl.style.opacity = ""; };
    api.hideHint = function () { if (hintEl) hintEl.style.opacity = "0"; };
    api.scope = function (which) { scopes.forEach(function (sc) { sc.classList.toggle("is-on", sc.getAttribute("data-pp-scope") === which); }); };
    api.isOpen = function () { return pop && !pop.hidden; };
    api.hot = function (move) { moves.forEach(function (m) { m.classList.toggle("is-on", m.getAttribute("data-move") === move); }); };

    // On a wide stage the file narrows if it must, then slides aside, so Pip
    // never covers the words it changed
    function makeRoom() {
      doc.style.transform = ""; doc.style.maxWidth = "";
      if (root.clientWidth <= 640 || pop.hidden) return;
      // Worked out, not measured, so the file's own animation can't fool it:
      // where it sits centred at its width, and where it fits left of Pip
      var cs = getComputedStyle(root);
      var padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
      var inner = root.clientWidth - padL - padR;
      var popLeft = pop.getBoundingClientRect().left - root.getBoundingClientRect().left;
      var full = Math.min(parseFloat(getComputedStyle(doc).maxWidth) || inner, inner);
      var width = Math.min(full, popLeft - 16 - 16);
      if (width < full) doc.style.maxWidth = Math.round(width) + "px";
      var centredLeft = padL + (inner - width) / 2;
      var fitLeft = Math.max(16, popLeft - 16 - width);
      if (fitLeft < centredLeft) doc.style.transform = "translateX(" + Math.round(fitLeft - centredLeft) + "px)";
    }
    api.open = function (scope) {
      pop.hidden = false;
      face.setAttribute("aria-expanded", "true");
      face.classList.remove("is-nudging");
      says.hidden = true;
      undoBtn.hidden = true;
      api.hot(null);
      if (scope) api.scope(scope);
      makeRoom();
      if (opts.onOpen) opts.onOpen();
    };
    api.close = function () {
      if (pop.hidden) return;
      pop.hidden = true;
      face.setAttribute("aria-expanded", "false");
      doc.style.transform = ""; doc.style.maxWidth = "";
      if (opts.onClose) opts.onClose();
    };
    api.say = function (text, working) {
      says.hidden = false;
      saysText.textContent = "";
      if (working) saysText.appendChild(dots());
      saysText.appendChild(document.createTextNode(text));
    };
    api.showUndo = function (on) { undoBtn.hidden = !on; };

    face.addEventListener("click", function () { if (api.isOpen()) api.close(); else api.open(); });
    $("[data-pp-close]", root).addEventListener("click", function () { api.close(); face.focus({ preventScroll: true }); });
    root.addEventListener("keydown", function (e) { if (e.key === "Escape" && api.isOpen()) { api.close(); face.focus({ preventScroll: true }); } });
    moves.forEach(function (m) {
      // keep the page's selection when a move is pressed
      m.addEventListener("mousedown", function (e) { e.preventDefault(); });
      m.addEventListener("click", function () { api.stop(); if (opts.onMove) opts.onMove(m.getAttribute("data-move")); });
    });
    undoBtn.addEventListener("click", function () { if (opts.onUndo) opts.onUndo(); });
    if (compose) compose.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = $("input", compose), words = input.value.trim();
      if (!words) return;
      input.value = "";
      api.stop();
      if (opts.onAsk) opts.onAsk(words);
    });
    var resizeT = null;
    window.addEventListener("resize", function () { clearTimeout(resizeT); resizeT = setTimeout(function () { if (api.isOpen()) makeRoom(); }, 120); });

    /* The play-through's pointer and its timers: one run at a time */
    var timers = [];
    api.later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
    api.moveTo = function (el, dx, dy) {
      if (!pointer || !el) return;
      var r = el.getBoundingClientRect(), b = root.getBoundingClientRect();
      pointer.style.opacity = "1";
      pointer.style.transform = "translate(" + Math.round(r.left - b.left + (dx == null ? r.width / 2 : dx)) + "px," + Math.round(r.top - b.top + (dy == null ? r.height / 2 : dy)) + "px)";
    };
    api.tap = function () { if (!pointer) return; pointer.classList.remove("is-tapping"); void pointer.offsetWidth; pointer.classList.add("is-tapping"); };
    api.stop = function () {
      if (!api.auto) return;
      api.auto = false;
      timers.forEach(clearTimeout); timers = [];
      if (pointer) pointer.style.opacity = "0";
      if (opts.onStop) opts.onStop();
    };
    api.done = function () {
      api.auto = false;
      if (pointer) pointer.style.opacity = "0";
      face.classList.add("is-nudging");
      if (replay) replay.hidden = false;
    };
    api.start = function (play) {
      api.stop();
      api.auto = true;
      if (replay) replay.hidden = true;
      play();
    };
    root.addEventListener("pointerdown", function (e) { if (api.auto && !e.target.closest("[data-pp-replay]")) api.stop(); }, true);
    if (replay) replay.addEventListener("click", function () { if (opts.onReplay) opts.onReplay(); });
    if (!reduced() && opts.play) {
      onceVisible(root, function () { setTimeout(function () { if (!api.touched) opts.play(); }, 500); }, 0.45);
    } else if (replay) replay.hidden = false;
    root.addEventListener("pointerdown", function () { api.touched = true; });
    return api;
  }

  /* ── Help with the bit you're stuck on ───────────────────────────────────
     A note you write in. Select words (or not, for the whole note), ask Pip,
     and only that bit changes, underlined until you change it. The first
     paragraph's rough words have Pip's real rewrites; anything else the
     visitor writes or picks is tidied, shortened, extended or listed by rule. */
  function helpDemo() {
    var root = $("[data-help]");
    if (!root) return;
    var body = $("[data-help-body]", root);
    var ask = $("[data-pp-ask]", root);
    var ROUGH = "new sage lamp in the shop!! linen shade on an oak base, looks lovely on a desk. £105. made to order so 2 weeks ish";
    var REST = "Photos to follow once the sun comes out.";
    var CANNED = {
      tidy: "Our new sage lamp is in the shop: a linen shade on an oak base that looks lovely on a desk. £105, made to order in about two weeks.",
      "short": "New in: a sage linen lamp on an oak base. £105, made to order.",
      more: "Our new sage lamp is in the shop. The linen shade is made by hand in my studio in Hove and sits on a solid oak base, so it looks lovely on a desk or a bedside table. It's £105, made to order in about two weeks, with free UK delivery.",
      list: ["Sage linen shade on an oak base", "Looks lovely on a desk", "£105", "Made to order, in about two weeks"]
    };
    var DONE_PICKED = {
      tidy: "Tidied the bit you picked. The rest is just as you wrote it.",
      "short": "Shortened the bit you picked. Nothing else changed.",
      more: "Added what your notes say: made in Hove, free UK delivery.",
      list: "Made the bit you picked into a list."
    };
    var DONE_ALL = {
      tidy: "Tidied each paragraph. Change anything you like.",
      "short": "Shortened each paragraph. Change anything you like.",
      more: "Added what your notes say. Change anything you like.",
      list: "Made each paragraph into a list."
    };
    var WORKING = { tidy: "Tidying it up", "short": "Shortening it", more: "Checking your notes", list: "Making it a list" };
    var picked = null, history = [], pp;

    function sentenceCase(t) { return t.replace(/(^|[.!?]\s+)([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
    function tidy(t) {
      var x = t.trim().replace(/\s+/g, " ").replace(/!+/g, ".").replace(/\s+ish\b/gi, "").replace(/\s*,\s*/g, ", ").replace(/\.\s*\./g, ".");
      x = sentenceCase(x);
      return /[.!?]$/.test(x) ? x : x + ".";
    }
    function isRough(t) {
      var a = t.toLowerCase().replace(/\s+/g, " ").trim();
      return a.length > 30 && (ROUGH.indexOf(a) >= 0 || a.indexOf(ROUGH.slice(0, 30)) >= 0);
    }
    function rewrite(kind, text) {
      if (isRough(text)) return CANNED[kind];
      if (kind === "tidy") return tidy(text);
      if (kind === "short") {
        var w = tidy(text).split(" ");
        return w.length <= 10 ? tidy(text) : w.slice(0, 10).join(" ").replace(/[,;:.]$/, "") + ".";
      }
      if (kind === "more") return tidy(text) + " It's made by hand in the studio in Hove, with free UK delivery.";
      var parts = tidy(text).split(/(?:[.;:]\s+|,\s+)/).map(function (x) { return x.replace(/\.$/, "").trim(); }).filter(Boolean);
      return parts.length > 1 ? parts : [tidy(text).replace(/\.$/, "")];
    }
    function kindFrom(words) {
      var w = words.toLowerCase();
      if (/list|bullet|points/.test(w)) return "list";
      if (/short|cut|trim|fewer|brief|concise|\d+\s*words/.test(w)) return "short";
      if (/more|expand|longer|detail|add/.test(w)) return "more";
      if (/tid|clean|fix|polish|grammar|better|improve|rewrite/.test(w)) return "tidy";
      return null;
    }

    // The bit picked, kept visible while Pip's pop-over has the focus
    function showPicked(range) {
      if (!window.CSS || !CSS.highlights || typeof Highlight === "undefined") return;
      if (range) CSS.highlights.set("pp-picked", new Highlight(range)); else CSS.highlights.delete("pp-picked");
    }
    function onSelection() {
      if (pp.auto) return;
      var sel = window.getSelection();
      if (!sel.rangeCount) return;
      var r = sel.getRangeAt(0);
      if (!body.contains(r.commonAncestorContainer)) return;
      if (r.collapsed || !r.toString().trim()) {
        if (pp.isOpen()) return; // a click in the pop-over keeps what was picked
        picked = null; ask.hidden = true;
        return;
      }
      pick(r);
    }
    function pick(r) {
      picked = r.cloneRange();
      pp.step(2);
      var rr = r.getBoundingClientRect(), b = root.getBoundingClientRect();
      ask.style.left = Math.round(Math.max(8, Math.min(root.clientWidth - 120, rr.right - b.left - 40))) + "px";
      ask.style.top = Math.round(Math.max(8, rr.top - b.top - 42)) + "px";
      if (!pp.isOpen()) ask.hidden = false;
    }
    document.addEventListener("selectionchange", onSelection);
    ask.addEventListener("mousedown", function (e) { e.preventDefault(); });
    ask.addEventListener("click", function () { openFor(true); });

    function openFor(useSelection) {
      if (!useSelection) picked = null;
      pp.open();
    }

    // Pip changes only the picked bit, or each paragraph for the whole note, in place
    function run(kind, then) {
      var had = !!(picked && !picked.collapsed && picked.toString().trim());
      var targets = [];
      if (had) targets.push(picked);
      else $$("p", body).forEach(function (p) { if (p.textContent.trim()) { var r = document.createRange(); r.selectNodeContents(p); targets.push(r); } });
      pp.hot(kind);
      if (!targets.length) { pp.say("Write something first, then ask me."); return; }
      pp.say(WORKING[kind] + "…", true);
      pp.showUndo(false);
      setTimeout(function () {
        var made = [];
        targets.forEach(function (range) {
          var text = range.toString();
          var span = el("span", "pp-edit");
          var original = range.cloneContents();
          range.deleteContents();
          range.insertNode(span);
          made.push({ span: span, out: rewrite(kind, text), original: original, same: rewrite(kind, text) === text.trim() });
        });
        history.push(made);
        picked = null; showPicked(null);
        window.getSelection().removeAllRanges();
        var i = 0;
        (function next() {
          if (i >= made.length) {
            pp.step(3);
            var unchanged = made.every(function (m) { return m.same; });
            pp.say(unchanged ? "That reads well already, so I've left it as it is." : had ? DONE_PICKED[kind] : DONE_ALL[kind]);
            pp.showUndo(true);
            pp.hint("<b>Underlined:</b> Pip's edit. Change any word and it's yours.");
            if (then) then();
            return;
          }
          var m = made[i++];
          if (Array.isArray(m.out) || reduced()) {
            if (Array.isArray(m.out)) m.out.forEach(function (line, k) { if (k) m.span.appendChild(el("br")); m.span.appendChild(document.createTextNode("•  " + line)); });
            else m.span.textContent = m.out;
            return next();
          }
          var words = m.out.split(" "), n = 0;
          (function word() {
            n++; m.span.textContent = words.slice(0, n).join(" ");
            if (n < words.length) setTimeout(word, 28); else next();
          })();
        })();
      }, reduced() ? 0 : 700);
    }
    function undo() {
      var made = history.pop();
      if (!made) return;
      made.forEach(function (m) { if (m.span.isConnected) m.span.replaceWith(m.original); });
      pp.say("Put back as you wrote it.");
      pp.showUndo(!!history.length);
      pp.hint();
    }

    // Typing over Pip's words makes them yours
    body.addEventListener("input", function () {
      pp.stop();
      pp.step(1);
      var n = window.getSelection().anchorNode;
      var host = n && (n.nodeType === 1 ? n : n.parentNode);
      var span = host && host.closest ? host.closest(".pp-edit") : null;
      if (span && !span.classList.contains("is-yours")) {
        span.classList.add("is-yours");
        pp.step(4);
        pp.hint("<b>Yours now.</b> Keep writing, or pick another bit and ask Pip.");
        if (pp.isOpen()) { pp.say("Your change stays. I'll learn from how you wrote it."); pp.showUndo(false); }
      } else if (history.length) pp.step(4);
    });

    function reset() {
      body.innerHTML = "";
      var p1 = el("p"); p1.setAttribute("data-help-p1", "");
      body.appendChild(p1);
      body.appendChild(el("p", "", REST));
      history = []; picked = null; showPicked(null); ask.hidden = true;
      pp.close(); pp.resetSteps(); pp.hint();
      return p1;
    }

    /* The play-through: you write, you pick, Pip helps, you change one of
       Pip's words and they're yours */
    function play() {
      pp.start(function () {
        var p1 = reset();
        pp.hideHint();
        var caret = el("i", "pp-caret");
        p1.appendChild(caret);
        var n = 0;
        (function type() {
          n = Math.min(ROUGH.length, n + 2);
          p1.textContent = ROUGH.slice(0, n);
          p1.appendChild(caret);
          pp.step(1);
          if (n < ROUGH.length) pp.later(type, 22); else pp.later(choose, 500);
        })();
        function choose() {
          caret.remove();
          var r = document.createRange(); r.selectNodeContents(p1);
          pick(r); showPicked(r);
          pp.later(function () { pp.moveTo(ask, 30, 16); }, 300);
          pp.later(function () { pp.tap(); openFor(true); }, 1200);
          pp.later(function () { pp.moveTo($('[data-move="tidy"]', root), 60, 20); }, 1700);
          pp.later(function () { pp.tap(); run("tidy", carryOn); }, 2500);
        }
        function carryOn() {
          if (!pp.auto) return;
          var span = $(".pp-edit", body);
          pp.later(function () { pp.moveTo(span, span.getBoundingClientRect().width * 0.55, 12); }, 600);
          pp.later(function () {
            pp.tap();
            var text = span.textContent, at = text.indexOf("lovely");
            if (at < 0) return finish();
            var before = text.slice(0, at), after = text.slice(at + 6), word = "gorgeous", k = 0;
            (function typeWord() {
              if (!pp.auto) return;
              k++;
              span.textContent = before + word.slice(0, k) + after;
              if (k === 1) { span.classList.add("is-yours"); pp.step(4); pp.showUndo(false); }
              if (k < word.length) pp.later(typeWord, 90); else finish();
            })();
          }, 1500);
        }
        function finish() {
          pp.later(function () { pp.say("Your change stays. I'll learn from how you wrote it."); }, 300);
          pp.later(function () { pp.close(); pp.hint(); pp.done(); }, 3200);
        }
      });
    }

    pp = pipPage(root, {
      play: play,
      onReplay: play,
      onMove: function (kind) { run(kind); },
      onUndo: undo,
      onAsk: function (words) {
        var k = kindFrom(words);
        if (k) run(k);
        else pp.say("In this sample I can tidy it up, make it shorter, say more or make it a list. On your Mac, ask me anything.");
      },
      onOpen: function () { ask.hidden = true; pp.scope(picked ? "sel" : "all"); showPicked(picked); },
      onClose: function () { showPicked(null); },
      onStop: function () {
        var c = $(".pp-caret", body); if (c) c.remove();
        var p1 = $("[data-help-p1]", body);
        // stopped part-way through typing: finish the rough line at once
        if (p1 && ROUGH.indexOf(p1.textContent) === 0 && p1.textContent.length < ROUGH.length) p1.textContent = ROUGH;
        pp.hint(); pp.done();
      }
    });
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

  /* See who and what Pip knows: the people, places and suppliers Pip has
     picked up from the notes, as the app's People and things page shows
     them. Open one to see what Pip knows and which notes it came from. */
  function peopleDemo() {
    var root = $("[data-people]");
    if (!root) return;
    var card = $("[data-pcard]", root);
    var f = function (k) { return $('[data-p="' + k + '"]', card); };
    var btns = $$("[data-person]", root);
    var PEOPLE = [
      { kind: "Customer", name: "Sarah Green", role: "Runs Hove Gift Co, a shop that stocks your scallops.",
        facts: [["Reorders", "about every two months"], ["Last order", "six medium scallops, " + D.ago(11)], ["Likes", "the mustard and the green linen"]],
        src: ["Orders", "Visit to Hove Gift Co"] },
      { kind: "Place", name: "Starling Studio", role: "Where your workshops happen, in Fiveways, Brighton.",
        facts: [["Holds", "six people round the big table"], ["Book it", "a month ahead, with Mel"], ["Bring", "the cutting mats and the iron"]],
        src: ["Drum workshop steps", "Bookings"] },
      { kind: "Supplier", name: "Oak & Co", role: "Makes the oak bases for your slim lamps.",
        facts: [["Price", "£28 a base, up from £22 in September"], ["Order", "ten at a time"], ["Takes", "about two weeks to arrive"]],
        src: ["Oak & Co order", "Costs"] }
    ];
    function fill(k) {
      var P = PEOPLE[k];
      f("kind").textContent = P.kind;
      f("name").textContent = P.name;
      f("role").textContent = P.role;
      var ul = f("facts"); ul.textContent = "";
      P.facts.forEach(function (x) { var li = el("li"); li.appendChild(el("b", "", x[0])); li.appendChild(el("span", "", x[1])); ul.appendChild(li); });
      var src = f("src"); var span = $("span", src); span.textContent = "From ";
      P.src.forEach(function (t, i) { if (i) span.appendChild(document.createTextNode(" ")); span.appendChild(el("span", "src", t)); });
    }
    // Hold the card at its tallest person, so nothing moves
    function measure() {
      card.style.minHeight = "";
      var on = btns.map(function (b) { return b.getAttribute("aria-pressed") === "true"; }).indexOf(true), h = 0;
      PEOPLE.forEach(function (_, k) { fill(k); h = Math.max(h, card.getBoundingClientRect().height); });
      fill(on < 0 ? 0 : on);
      card.style.minHeight = Math.ceil(h) + "px";
    }
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.classList.add("is-tried");
        var k = +btn.getAttribute("data-person");
        btns.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
        if (reduced() || !card.animate) { fill(k); return; }
        var out = card.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(3px)" }], { duration: 110, easing: EASE_OUT, fill: "forwards" });
        out.onfinish = function () {
          fill(k);
          out.cancel();
          card.animate([{ opacity: 0, transform: "translateY(5px)" }, { opacity: 1, transform: "none" }], { duration: 200, easing: EASE_OUT });
        };
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
    peopleDemo();
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
    var note = $("[data-takeover-note]", dlg);
    var noteOk = $("[data-takeover-note-ok]", dlg);
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
      // The first time, a word on what's different here (no live AI), while
      // Pip loads behind it
      if (note && !noteSeen()) {
        note.hidden = false;
        noteOk.focus({ preventScroll: true });
      } else {
        closeBtn.focus({ preventScroll: true });
      }
      document.addEventListener("keydown", onKey);
    }

    var NOTE_KEY = "pip-site:demo-note-seen";
    var noteShown = false;
    function noteSeen() {
      if (noteShown) return true;
      try { return window.localStorage.getItem(NOTE_KEY) === "1"; } catch (e) { return false; }
    }
    function dismissNote() {
      if (!note || note.hidden) return false;
      note.hidden = true;
      noteShown = true;
      try { window.localStorage.setItem(NOTE_KEY, "1"); } catch (e) { /* private window: shown once per visit */ }
      closeBtn.focus({ preventScroll: true });
      return true;
    }
    if (noteOk) noteOk.addEventListener("click", dismissNote);

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

    function onKey(e) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (!dismissNote()) close();
    }

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

  /* ── in view ───────────────────────────────────────────────────────────────
     The small moments (the hand-drawn notes, the squiggle under a word) play
     when they're well on screen, not on load, so nobody scrolls past them
     half-drawn. Each [data-inview] gets .is-seen once its top is above the
     lowest fifth of the screen. Hover a squiggled word and it draws again. */
  function inView() {
    var nodes = $$("[data-inview]");
    if (!nodes.length) return;
    function see(n) { n.classList.add("is-seen"); }
    if (reduced() || !("IntersectionObserver" in window)) { nodes.forEach(see); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        see(e.target);
      });
    }, { rootMargin: "0px 0px -20% 0px" });
    nodes.forEach(function (n) { io.observe(n); });

    $$(".squiggle[data-inview]").forEach(function (s) {
      var flip = false, last = 0;
      s.addEventListener("pointerenter", function () {
        var now = Date.now();
        if (!s.classList.contains("is-seen") || now - last < 900) return;
        last = now;
        flip = !flip;
        s.classList.toggle("is-redraw-a", flip);
        s.classList.toggle("is-redraw-b", !flip);
      });
    });
  }

  /* ── peek ──────────────────────────────────────────────────────────────────
     Pip peeks over the play window, then the "no download needed" note
     follows. On the first screen it waits about two seconds, so the eye has
     landed on the window first; if the window is further down, it happens
     as soon as a scroll brings the window's top edge on screen. Any scroll
     while it's waiting brings it up sooner. */
  function peek() {
    var stage = $(".play-stage");
    var play = $("#play");
    if (!stage || !play) return;
    if (reduced()) { stage.classList.add("is-up"); return; }
    var timer = null;
    function inSight() {
      var r = play.getBoundingClientRect();
      return r.top < window.innerHeight * 0.92 && r.bottom > 0; // the spot Pip peeks from is on screen
    }
    function up() {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      stage.classList.add("is-up");
    }
    function onScroll() {
      if (!inSight()) return;
      clearTimeout(timer);
      timer = setTimeout(up, 450);
    }
    if (inSight()) timer = setTimeout(up, 2200);
    window.addEventListener("scroll", onScroll, { passive: true });
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
     "Help with everything you make." Pip on your page (pipPage), with six
     files open in tabs along the top of the file. Opening one shows it as it
     is and opens Pip's pop-over with what Pip can do for that file. A move
     plays the job in the file itself while Pip's reply says what's happening
     now, then what was done, with Undo. The newsletter's draft and the costs'
     prices are yours to change: typing in Pip's draft makes it yours, and a
     new price redoes the sums. Opening another file, at any moment, stops
     whatever is playing and shows that file fresh.
     The play-through runs once: it drafts the newsletter, works out what the
     costs keep, then changes the slim lamp's price.
     The file is one height for every file and every moment (CSS). On a wide
     stage it's one width too, the room beside Pip's pop-over, whether Pip is
     open or not, so opening Pip only slides it aside; on a phone Pip's
     pop-over keeps the room of its tallest reply under the file. Under
     reduced motion a job lands at once. */

  function jobs() {
    var root = $("[data-jobs]");
    if (!root) return;

    var NL = [
      "Hello, and thank you for such a lovely summer at the studio.",
      "The mustard scallop is finally in the shop. It's the linen I've been saving for months, and as always there's only one.",
      "Two places left on the drum workshop on " + D.long(D.drum) + ", so bring a fabric you love. And the lino printing day is open for " + D.long(D.lino) + ": six places, £110, and you take your printed shade home.",
      "The last posting day for Christmas is " + D.dayMonth(D.xmas) + ".",
      "Speak soon."
    ];
    // The idea(s) each paragraph is written from ("Speak soon." is the sign-off)
    var NL_FROM = [[4], [0], [1, 2], [3], []];
    var WORD_MS = 34, PARA_MS = 140;

    var doc = $("[data-pp-doc]", root);
    var pop = $("[data-pp-pop]", root);
    var says = $("[data-pp-says]", root);
    var saysText = $("[data-pp-says-text]", root);
    var undoBtn = $("[data-pp-undo]", root);
    var tabs = $$("[data-file]", root);
    var surfs = $$(".surf", root);
    var moveBtns = $$(".pp-move", root);

    var note = $("#nl");
    var nlText = $("#nl-text");
    var ideasBox = $("#nl-ideas");
    var ideas = $$(".rough li", ideasBox);

    var photo = $("#photo-job");
    var frame = $("#photo-frame");
    var tools = $$(".ptool", photo);
    var PHOTO_BEFORE = frame.getAttribute("aria-label");
    var PHOTO_AFTER = "The same sage lamp, cropped square, tidied, brightened and cut out, on a plain sand backdrop with a soft shadow, like a studio shot";
    var PHOTO_STATES = ["is-framing", "is-cropped", "is-square", "is-selecting", "is-filled", "is-bright", "is-tracing", "is-cut", "is-backdrop"];

    var costs = $("#costs");
    var heads = { cost: $("th.c-cost", costs), marg: $("th.c-marg", costs) };
    var rows = $$(".tbl--costs tbody tr", costs).map(function (tr) {
      var price = $(".c-price", tr);
      return {
        tr: tr, price: price, cost: $("td.c-cost", tr), marg: $("td.c-marg", tr),
        make: tr.getAttribute("data-parts").split(",").reduce(function (a, b) { return a + +b; }, 0),
        say: tr.getAttribute("data-say"), was: price.textContent, good: price.textContent
      };
    });
    var lamp = rows[rows.length - 1];

    var deck = $("#deck-job");
    var slideEls = $$(".slide", deck);

    var cv = $("#cv");
    var cvPrices = $("#cv-prices");
    var cvPrice = $("#cv-price");
    var cvPriceText = $(".cv-t", cvPrice);
    var PRICE_BEFORE = cvPriceText.textContent;
    var PRICE_AFTER = "Scallop, 60cm: £400";

    var dash = $("#dash");
    var chart = $(".chart", dash);
    var tiles = $$(".tile-v", dash);

    var pp;
    var cur = 0;         // the open file
    var busy = null;     // the move playing now: { move, snap, then }
    var hist = [];       // what Undo puts back, newest last
    var said = null;     // what Pip last said about the open file, shown again when the pop-over reopens
    var hotMove = null;
    var typing = false;  // the play-through is typing a price

    /* ── timing: one run at a time ────────────────────────────────────────── */

    var gen = 0, timers = [];
    function later(fn, ms) {
      var id = gen;
      timers.push(setTimeout(function () { if (id === gen) fn(); }, ms));
    }
    // Stop every pending moment of the job playing
    function stopAll() {
      gen++;
      timers.forEach(clearTimeout);
      timers = [];
    }
    // Put a state in place at once: no transition plays
    function instantly(fn) {
      root.classList.add("is-instant");
      fn();
      void root.offsetWidth;
      root.classList.remove("is-instant");
    }
    function settle(node) {
      if (node.getAnimations) node.getAnimations().forEach(function (a) { a.cancel(); });
    }

    /* ── Pip's side: what it says, and the move it's on ───────────────────── */

    function reply(text, working, undo) {
      said = { text: text, working: !!working, undo: !!undo };
      pp.say(text, working);
      pp.showUndo(!!undo);
    }
    function working(text) { reply(text, true, false); }
    function hot(move) { hotMove = move; pp.hot(move); }

    /* ── 0 · The newsletter ─────────────────────────────────────────────────
       Pip reads the ideas, washing each in turn; then writes the newsletter
       under the title, word by word, underlined as Pip's draft. While a
       paragraph writes, the idea it comes from holds a wash; when it's
       written, that idea folds away, and "Some ideas" goes with the last of
       them. The note follows the writing point if it runs past the file.
       Then it's yours: type in it and the underline goes. */

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
    // Only a note longer than the file gets the fade at its foot
    function measureNote() {
      if (note.hidden) return;
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
      var id = gen;
      what.forEach(function (node) {
        var h = node.offsetHeight;
        var anim = node.animate && node.animate(
          [{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0, paddingTop: "0px", paddingBottom: "0px" }],
          { duration: 300, easing: EASE_OUT }
        );
        var gone = function () { if (id === gen) { node.hidden = true; measureNote(); } };
        if (anim) anim.onfinish = gone; else gone();
      });
    }
    function nlEditable(on) {
      if (on) { nlText.setAttribute("contenteditable", "true"); nlText.setAttribute("role", "textbox"); nlText.setAttribute("aria-multiline", "true"); nlText.setAttribute("aria-label", "The newsletter: you can write in it"); }
      else { nlText.removeAttribute("contenteditable"); nlText.removeAttribute("role"); nlText.removeAttribute("aria-multiline"); nlText.removeAttribute("aria-label"); }
    }
    function nlPara(n, done) {
      if (n >= NL.length) {
        if (note.classList.contains("is-long")) note.scrollTo({ top: note.scrollHeight, behavior: "smooth" });
        nlEditable(true);
        done();
        return;
      }
      var src = NL_FROM[n].map(function (i) { return ideas[i]; });
      src.forEach(function (li) { li.classList.add("is-lit"); });
      var before = topIn(ideasBox);
      var p = el("p");
      var span = el("span", "pp-edit");
      var text = document.createTextNode("");
      var caret = el("span", "caret");
      caret.setAttribute("aria-hidden", "true");
      span.appendChild(text);
      p.appendChild(span);
      p.appendChild(caret);
      nlText.appendChild(p);
      pushIdeas(before);
      var words = NL[n].split(" ");
      var k = 0;
      (function word() {
        var at0 = topIn(ideasBox);
        text.data += (k ? " " : "") + words[k++];
        pushIdeas(at0);
        follow(caret, n);
        if (k < words.length) { later(word, WORD_MS); return; }
        if (src.length) fold(src);
        later(function () { caret.remove(); nlPara(n + 1, done); }, PARA_MS);
      })();
    }
    function nlPlay(done) {
      working("Reading your ideas…");
      nlText.textContent = "";
      ideas.forEach(function (li, i) { later(function () { li.classList.add("is-lit"); }, 120 + i * 160); });
      later(function () {
        ideas.forEach(function (li) { li.classList.remove("is-lit"); });
        working("Writing it in your words…");
      }, 1300);
      later(function () { nlPara(0, done); }, 1550);
    }
    function nlEnd() {
      [ideasBox].concat(ideas).forEach(settle);
      nlText.textContent = "";
      NL.forEach(function (t) { var p = el("p"); p.appendChild(el("span", "pp-edit", t)); nlText.appendChild(p); });
      ideas.forEach(function (li) { li.classList.remove("is-lit"); li.hidden = true; });
      ideasBox.hidden = true;
      note.scrollTop = 0;
      nlEditable(true);
      measureNote();
    }
    function nlReset() {
      [ideasBox].concat(ideas).forEach(function (node) { settle(node); node.hidden = false; });
      nlEditable(false);
      nlText.textContent = "";
      ideas.forEach(function (li) { li.classList.remove("is-lit"); });
      note.scrollTop = 0;
      note.classList.remove("is-scrolled");
      measureNote();
    }
    // Pasted words come in as plain words
    nlText.addEventListener("paste", function (e) {
      e.preventDefault();
      var text = ((e.clipboardData || window.clipboardData).getData("text") || "").replace(/\s+/g, " ");
      if (document.execCommand) document.execCommand("insertText", false, text);
    });
    // Typing over Pip's words makes them yours
    nlText.addEventListener("input", function () {
      pp.stop();
      var n = window.getSelection().anchorNode;
      var host = n && (n.nodeType === 1 ? n : n.parentNode);
      var span = host && host.closest ? host.closest(".pp-edit") : null;
      pp.step(4);
      measureNote();
      if (span && !span.classList.contains("is-yours")) {
        span.classList.add("is-yours");
        pp.hint("<b>Yours now.</b> Keep writing, or open another file.");
        hist = [];
        reply("Your change stays. I'll learn from how you wrote it.", false, false);
      }
    });

    /* ── 1 · The product shot ───────────────────────────────────────────────
       A dim snapshot of the lamp on a busy desk, made into a product shot by
       one move: crop it square (the notepad still in), paint a selection over
       what goes and fill it in, brighten it, trace the lamp's edge and let the
       room fall away to transparency, then set it on a sand backdrop with a
       soft shadow. Each tool lights as it works and keeps a tick once used. */

    function tool(name) {
      tools.forEach(function (t) {
        if (t.classList.contains("is-active")) { t.classList.remove("is-active"); t.classList.add("is-done"); }
        if (name && t.getAttribute("data-tool") === name) t.classList.add("is-active");
      });
    }
    function add(c) { photo.classList.add.apply(photo.classList, c.split(" ")); }
    function photoPlay(done) {
      working("Cropping it square…");
      tool("crop");
      add("is-framing");
      later(function () { add("is-cropped"); }, 800);
      later(function () { add("is-square"); photo.classList.remove("is-framing"); }, 1700);
      later(function () { working("Taking out the clutter…"); tool("remove"); add("is-selecting"); }, 2000);
      later(function () { add("is-filled"); }, 3200);
      later(function () { working("Brightening it…"); tool("bright"); add("is-bright"); }, 3800);
      later(function () { working("Cutting the lamp out…"); tool("cut"); add("is-tracing"); }, 5000);
      later(function () { add("is-cut"); }, 6300);
      later(function () { working("Setting it on a clean backdrop…"); tool("backdrop"); }, 7300);
      later(function () { add("is-backdrop"); }, 7500);
      later(function () { photoEnd(); done(); }, 8800);
    }
    function photoEnd() {
      photo.classList.remove("is-framing", "is-selecting", "is-tracing");
      add("is-cropped is-square is-filled is-bright is-cut is-backdrop");
      tools.forEach(function (t) { t.classList.remove("is-active"); t.classList.add("is-done"); });
      frame.setAttribute("aria-label", PHOTO_AFTER);
    }
    function photoReset() {
      PHOTO_STATES.forEach(function (c) { photo.classList.remove(c); });
      tools.forEach(function (t) { t.classList.remove("is-active", "is-done"); });
      frame.setAttribute("aria-label", PHOTO_BEFORE);
    }

    /* ── 2 · The costs ──────────────────────────────────────────────────────
       Your spreadsheet, and only what Pip's tables do: a formula column (Cost
       to make), a percent column (Margin) and a conditional format that
       colours any row whose margin is under 50%. Each move adds its part in
       place, cell by cell, the columns Pip added washed as Pip's until you
       change a number. The prices are yours to change: the sums follow. */

    var has = { cost: false, marg: false, low: false };
    function priceOf(r) {
      var v = parseFloat(r.price.textContent.replace(/[^0-9.]/g, ""));
      return isNaN(v) ? null : v;
    }
    function marginOf(r) {
      var p = priceOf(r);
      return p ? Math.round((p - r.make) / p * 100) : null;
    }
    function under() { return rows.filter(function (r) { var m = marginOf(r); return m != null && m < 50; }); }
    // The sums, from the prices as they are now; a margin that changes flashes
    function sums(flash) {
      rows.forEach(function (r) {
        r.cost.textContent = "£" + r.make;
        var m = marginOf(r), text = m == null ? "–" : m + "%";
        if (flash && has.marg && r.marg.textContent !== text) {
          r.marg.classList.remove("is-recalc");
          void r.marg.offsetWidth;
          r.marg.classList.add("is-recalc");
        }
        r.marg.textContent = text;
        r.tr.classList.toggle("is-low", has.low && m != null && m < 50);
      });
    }
    function costsSet(h) {
      has = { cost: !!h.cost, marg: !!h.marg, low: !!h.low };
      costs.classList.toggle("has-cost", has.cost);
      costs.classList.toggle("has-marg", has.marg);
      costs.classList.toggle("is-ruled", has.low);
      if (!has.cost) heads.cost.classList.remove("is-pips");
      if (!has.marg) heads.marg.classList.remove("is-pips");
      rows.forEach(function (r) { r.tr.classList.toggle("is-c", has.cost); r.tr.classList.toggle("is-m", has.marg); });
      sums(false);
    }
    function costsSnap() { return { cost: has.cost, marg: has.marg, low: has.low }; }
    function costsReset() {
      rows.forEach(function (r) { r.price.textContent = r.was; r.good = r.was; r.marg.classList.remove("is-recalc"); r.price.classList.remove("is-typing"); });
      if (costs.contains(document.activeElement)) document.activeElement.blur();
      heads.cost.classList.remove("is-pips");
      heads.marg.classList.remove("is-pips");
      costsSet({});
    }
    // Each part lands cell by cell, from t; each returns when it's done
    function addCost(t) {
      has.cost = true;
      later(function () { heads.cost.classList.add("is-pips"); costs.classList.add("has-cost"); sums(false); }, t + 300);
      rows.forEach(function (r, i) { later(function () { r.tr.classList.add("is-c"); }, t + 650 + i * 250); });
      return t + 650 + rows.length * 250;
    }
    function addMarg(t) {
      has.marg = true;
      later(function () { working("Working out your margins…"); heads.marg.classList.add("is-pips"); costs.classList.add("has-marg"); sums(false); }, t);
      rows.forEach(function (r, i) { later(function () { r.tr.classList.add("is-m"); }, t + 350 + i * 250); });
      return t + 350 + rows.length * 250;
    }
    function addLow(t) {
      has.low = true;
      later(function () { working("Highlighting anything under 50%…"); }, t);
      later(function () { costs.classList.add("is-ruled"); sums(false); }, t + 450);
      return t + 450;
    }
    function costPlay(done) {
      working("Adding a Cost to make column…");
      later(done, addCost(0) + 400);
    }
    function marginPlay(done) {
      var t = 0;
      if (!has.cost) { working("Adding a Cost to make column…"); t = addCost(0) + 150; }
      later(done, addMarg(t) + 400);
    }
    function lowPlay(done) {
      var t = 0;
      if (!has.cost) { working("Adding a Cost to make column…"); t = addCost(0) + 150; }
      if (!has.marg) t = addMarg(t) + 150;
      later(done, addLow(t) + 700);
    }
    // At once, from the table as it was before the move: the columns it adds are marked as Pip's
    function costsEnd(to, was) {
      costsSet(to);
      if (!was.cost) heads.cost.classList.add("is-pips");
      if (to.marg && !was.marg) heads.marg.classList.add("is-pips");
    }
    function costEnd(was) { costsEnd({ cost: true, marg: has.marg, low: has.low }, was || {}); }
    function marginEnd(was) { costsEnd({ cost: true, marg: true, low: has.low }, was || {}); }
    function lowEnd(was) { costsEnd({ cost: true, marg: true, low: true }, was || {}); }
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    function marginDone() {
      var low = null;
      rows.forEach(function (r) { var m = marginOf(r); if (m != null && (!low || m < low.m)) low = { r: r, m: m }; });
      if (!low) return "Added Margin: what you keep from each price, after it's made.";
      return cap(low.r.say) + " keeps the least, " + low.m + "%." + (low.r === lamp ? " Its oak base is £28 of the £" + lamp.make + " it costs to make." : "");
    }
    function lowDone() {
      var u = under();
      if (!u.length) return "Nothing's under 50% right now. Anything that drops below will be highlighted.";
      if (u.length === 1) return cap(u[0].say) + " keeps under 50%, so it's highlighted. It updates as your prices change.";
      return "Highlighted the " + u.length + " that keep under 50%. It updates as your prices change.";
    }

    // A price you change: the sums follow as you type, and it's yours
    function priceCell(t) { return t && t.closest ? t.closest("td.c-price") : null; }
    costs.addEventListener("input", function (e) {
      if (!priceCell(e.target)) return;
      pp.stop();
      sums(true);
      pp.step(4);
      heads.cost.classList.remove("is-pips");
      heads.marg.classList.remove("is-pips");
      if (has.marg) pp.hint("<b>Your spreadsheet:</b> change a price and the sums keep up.");
    });
    // Return keeps the new price; Esc puts the old one back (and leaves Pip open)
    costs.addEventListener("keydown", function (e) {
      var td = priceCell(e.target);
      if (!td) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        td.textContent = rows.filter(function (x) { return x.price === td; })[0].good;
        sums(false);
      }
      if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); td.blur(); }
    });
    costs.addEventListener("paste", function (e) {
      if (!priceCell(e.target)) return;
      e.preventDefault();
      var text = ((e.clipboardData || window.clipboardData).getData("text") || "").replace(/\s+/g, " ").trim();
      if (document.execCommand) document.execCommand("insertText", false, text);
    });
    // Clicked into, a price is picked whole, so what you type replaces it, as in a spreadsheet
    costs.addEventListener("focusin", function (e) {
      var td = priceCell(e.target);
      if (!td) return;
      setTimeout(function () {
        if (document.activeElement !== td) return;
        var r = document.createRange();
        r.selectNodeContents(td);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      }, 0);
    });
    // Done editing: written as money, or back as it was if it isn't a price;
    // and if Pip's sums are in, Pip says where that price leaves it
    function money(v) { return "£" + (v % 1 ? v.toFixed(2) : v); }
    function priceSaid(r) {
      var m = marginOf(r);
      if (!has.marg || m == null) return;
      var t = cap(r.say) + " keeps " + m + "% now.";
      if (has.low) t += m < 50 ? " That's under 50%, so it's highlighted." : " That's over 50%, so it isn't highlighted.";
      reply(t, false, hist.length > 0);
    }
    costs.addEventListener("focusout", function (e) {
      var td = priceCell(e.target);
      if (!td) return;
      var r = rows.filter(function (x) { return x.price === td; })[0];
      var v = priceOf(r);
      td.textContent = v ? money(v) : r.good;
      var changed = td.textContent !== r.good;
      r.good = td.textContent;
      sums(false);
      if (changed) priceSaid(r);
    });
    // The play-through types a new price in, then the sums follow
    function typePrice(r, text, done) {
      typing = true;
      r.price.classList.add("is-typing");
      var k = 0;
      (function next() {
        k++;
        r.price.textContent = text.slice(0, k);
        if (k < text.length) { pp.later(next, 150); return; }
        typed(r, text);
        done();
      })();
    }
    function typed(r, text) {
      typing = false;
      r.price.textContent = text;
      r.good = text;
      r.price.classList.remove("is-typing");
      heads.cost.classList.remove("is-pips");
      heads.marg.classList.remove("is-pips");
      sums(true);
      pp.step(4);
      priceSaid(r);
    }

    /* ── 3 · The deck ───────────────────────────────────────────────────────
       The steps note steps aside, a slide is dealt for each step, then the
       step photos go in. */

    function deckPlay(done) {
      working("Making a slide for each step…");
      deck.classList.add("is-dealing");
      slideEls.forEach(function (s, i) { later(function () { s.classList.add("is-dealt"); }, 300 + i * 280); });
      later(function () { working("Adding your step photos…"); deck.classList.add("has-photos"); }, 300 + slideEls.length * 280 + 250);
      later(done, 3600);
    }
    function deckEnd() {
      deck.classList.add("is-dealing", "has-photos");
      slideEls.forEach(function (s) { s.classList.add("is-dealt"); });
    }
    function deckReset() {
      deck.classList.remove("is-dealing", "has-photos");
      slideEls.forEach(function (s) { s.classList.remove("is-dealt"); });
    }

    /* ── 4 · The collection ─────────────────────────────────────────────────
       The ideas regroup into fabrics, shapes and notes; then Pip reads the
       scallop prices and pencils in the one that's missing, in place, marked
       as Pip's. */

    function cvMark() {
      settle(cvPriceText);
      cvPriceText.textContent = "Scallop, 60cm: ";
      cvPriceText.appendChild(el("span", "pp-edit", "£400"));
    }
    function cvPlay(done) {
      working("Sorting your ideas…");
      cv.classList.add("is-sorted");
      later(function () { working("Pricing the 60cm scallop…"); cvPrices.classList.add("is-lit"); }, 1900);
      later(function () { cvPrices.classList.remove("is-lit"); cvPrice.classList.add("is-lit"); }, 2800);
      later(function () { swapText(cvPriceText, PRICE_AFTER); }, 3250);
      later(cvMark, 3600);
      later(function () { cvPrice.classList.remove("is-lit"); done(); }, 4300);
    }
    function cvEnd() {
      cv.classList.add("is-sorted");
      cvPrices.classList.remove("is-lit");
      cvPrice.classList.remove("is-lit");
      cvMark();
    }
    function cvReset() {
      settle(cvPriceText);
      cv.classList.remove("is-sorted");
      cvPrices.classList.remove("is-lit");
      cvPrice.classList.remove("is-lit");
      cvPriceText.textContent = PRICE_BEFORE;
    }

    /* ── 5 · The year ───────────────────────────────────────────────────────
       The sheet becomes a dashboard: totals that count up, a chart that
       grows, and the one finding, picked out. */

    function countUp(nodes, duration) {
      var t0 = null, id = gen;
      function frameFn(ts) {
        if (id !== gen) return;
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
    function dashPlay(done) {
      working("Adding up the year…");
      later(function () { dash.classList.add("is-shown"); countUp(tiles, 1400); }, 300);
      later(function () { working("Drawing the chart…"); chart.classList.add("is-grown"); }, 1500);
      later(function () { working("Looking for what stands out…"); dash.classList.add("is-found"); }, 2700);
      later(done, 3800);
    }
    function dashEnd() {
      dash.classList.add("is-shown", "is-found");
      chart.classList.add("is-grown");
      setTiles(true);
    }
    function dashReset() {
      dash.classList.remove("is-shown", "is-found");
      chart.classList.remove("is-grown");
      setTiles(false);
    }

    /* ── the files: what Pip can do in each, and the words that ask for it ── */

    var FILES = [
      { scope: "note", reset: nlReset,
        can: "draft this newsletter from your ideas",
        ask: [[/draft|write|newsletter|idea|email|turn|word/, "draft"]],
        moves: { draft: { play: nlPlay, end: nlEnd,
          done: "Drafted from your ideas, in your words. The dates and prices are the bit to check.",
          hint: "<b>Underlined:</b> Pip's draft. Change any word and it's yours." } } },
      { scope: "photo", reset: photoReset,
        can: "make this photo a product shot",
        ask: [[/product|shot|photo|picture|tidy|crop|bright|light|clean|clutter|backdrop|background|cut|shop|edit/, "shot"]],
        moves: { shot: { play: photoPlay, end: photoEnd,
          done: "There's your product shot: square, bright and on a clean backdrop, ready for the shop." } } },
      { scope: "table", reset: costsReset, stack: true, snap: costsSnap, restore: costsSet,
        can: "work out costs and margins, and flag the low ones",
        hint: "<b>Your spreadsheet:</b> click a price and change it.",
        ask: [[/under|flag|low|highlight|colou?r|50/, "low"], [/margin|keep|profit|earn|left over|percent|%|make on/, "margin"], [/\bcosts?\b|to make|add (it |them )?up|\bsum|total|spend/, "cost"]],
        moves: {
          cost: { play: costPlay, end: costEnd,
            done: "Added Cost to make: materials, your time and postage together.",
            already: function () { return has.cost && "Cost to make is already in, after Postage."; },
            hint: "<b>Your spreadsheet:</b> change a price and the sums keep up." },
          margin: { play: marginPlay, end: marginEnd, done: marginDone,
            already: function () { return has.marg && "Margin is already in, at the end of the table."; },
            hint: "<b>Your spreadsheet:</b> change a price and the sums keep up." },
          low: { play: lowPlay, end: lowEnd, done: lowDone,
            already: function () { return has.low && "Anything under 50% is already highlighted."; },
            hint: "<b>Your spreadsheet:</b> change a price and the sums keep up." }
        } },
      { scope: "note", reset: deckReset,
        can: "make these steps into slides",
        ask: [[/slide|deck|present|keynote|powerpoint|show/, "slides"]],
        moves: { slides: { play: deckPlay, end: deckEnd,
          done: "Six slides, one for each step, with your photos in." } } },
      { scope: "canvas", reset: cvReset,
        can: "sort this canvas and fill in what's missing",
        ask: [[/sort|tidy|organi[sz]e|group|gap|fill|price|missing|arrange|mess/, "sort"]],
        moves: { sort: { play: cvPlay, end: cvEnd,
          done: "Sorted into fabrics, shapes and notes. The 60cm scallop had no price, so I've pencilled in £400 to match your sizes." } } },
      { scope: "table", reset: dashReset,
        can: "chart this and make a dashboard",
        ask: [[/chart|graph|dashboard|total|trend|best|plot|visual|sales|month|year/, "dash"]],
        moves: { dash: { play: dashPlay, end: dashEnd,
          done: "One you might have missed: workshops made 43% of sales this year, up from 22% last year." } } }
    ];

    /* ── moves: Pip works in the file ─────────────────────────────────────── */

    function press(move, then) {
      var f = FILES[cur], m = f.moves[move];
      if (!m) return;
      if (busy && busy.move === move) return;
      if (busy) land(true);
      pp.step(2);
      hot(move);
      var already = m.already && m.already();
      if (already) { reply(already, false, hist.length > 0); return; }
      // A one-move file runs from its before, every time
      if (!f.stack) { instantly(f.reset); hist = []; }
      busy = { move: move, snap: f.snap ? f.snap() : null, then: then };
      pp.showUndo(false);
      if (reduced()) { land(true); return; }
      m.play(function () { land(false); });
    }

    // The move's end: the file as Pip left it, what Pip did, and Undo
    function land(now) {
      var b = busy;
      if (!b) return;
      var f = FILES[cur], m = f.moves[b.move];
      busy = null;
      if (now) { stopAll(); instantly(function () { m.end(b.snap); }); }
      hist.push(b.snap);
      pp.step(3);
      hot(b.move);
      reply(typeof m.done === "function" ? m.done() : m.done, false, true);
      pp.hint(m.hint || f.hint || null);
      measureNote();
      if (b.then) b.then();
    }

    function undo() {
      var f = FILES[cur];
      if (busy || !hist.length) return;
      var snap = hist.pop();
      instantly(function () { if (f.restore) f.restore(snap); else f.reset(); });
      hot(null);
      pp.step(4);
      reply("Put back as it was.", false, hist.length > 0);
      pp.hint(f.hint || null);
    }

    function ask(words) {
      var f = FILES[cur], w = words.toLowerCase();
      for (var i = 0; i < f.ask.length; i++) {
        if (f.ask[i][0].test(w)) { press(f.ask[i][1]); return; }
      }
      pp.step(2);
      hot(null);
      reply("In this sample I can " + f.can + ". On your Mac, ask me anything.", false, hist.length > 0 && !busy);
    }

    /* ── files: opening one shows it fresh, with Pip's moves for it ───────── */

    function show(i) {
      var was = cur;
      cur = i;
      tabs.forEach(function (t, k) {
        t.setAttribute("aria-selected", k === i ? "true" : "false");
        t.tabIndex = k === i ? 0 : -1;
      });
      moveBtns.forEach(function (b) { b.hidden = +b.getAttribute("data-for") !== i; });
      surfs.forEach(function (s, k) { s.hidden = k !== i; });
      if (i !== was && !reduced() && surfs[i].animate) {
        surfs[i].animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 180, easing: EASE_OUT });
      }
      measureNote();
    }
    // Every file starts fresh: whatever is playing stops, at once
    function fresh(i) {
      stopAll();
      var was = cur;
      instantly(function () { FILES[was].reset(); if (i !== was) FILES[i].reset(); });
      busy = null; hist = []; said = null; hotMove = null;
      show(i);
    }
    function pick(i) {
      if (i !== cur) {
        fresh(i);
        pp.resetSteps();
        if (pp.auto) pp.hideHint(); else pp.hint(FILES[i].hint || null);
        pp.open();
      } else if (!pp.isOpen()) pp.open();
      pp.step(1);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { pp.stop(); pick(i); });
      t.addEventListener("keydown", function (e) {
        var to = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i + tabs.length - 1) % tabs.length : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
        if (to === null) return;
        e.preventDefault();
        pp.stop();
        tabs[to].focus();
        pick(to);
      });
    });

    /* ── room: the file's width on a wide stage, Pip's on a phone ─────────── */

    // On a wide stage the file keeps the width it has beside Pip's pop-over,
    // open or shut, so opening Pip only slides it aside (pipPage's own
    // narrowing, while Pip is open, never goes below this). Measured from the
    // pop-over's place, not its rise, which scales it.
    function fitDoc() {
      if (root.clientWidth <= 640) { doc.style.width = ""; return; }
      var cs = getComputedStyle(root);
      var inner = root.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      var full = Math.min(parseFloat(cs.getPropertyValue("--doc-cap")) || inner, inner);
      var shut = pop.hidden;
      if (shut) { pop.style.visibility = "hidden"; pop.hidden = false; }
      var popLeft = pop.offsetLeft;
      if (shut) { pop.hidden = true; pop.style.visibility = ""; }
      doc.style.width = Math.round(Math.min(full, popLeft - 16 - 16)) + "px";
    }
    // On a phone the pop-over sits under the file and keeps the room of the
    // tallest it gets, for any file, so the stage never changes height
    function fitPop() {
      pop.style.minHeight = "";
      if (root.clientWidth > 640) return;
      var keep = {
        hidden: pop.hidden, vis: pop.style.visibility, says: says.hidden, undo: undoBtn.hidden,
        kids: Array.prototype.slice.call(saysText.childNodes), moves: moveBtns.map(function (b) { return b.hidden; })
      };
      pop.style.visibility = "hidden";
      pop.hidden = false;
      says.hidden = false;
      undoBtn.hidden = false;
      var h = 0;
      FILES.forEach(function (f, i) {
        moveBtns.forEach(function (b) { b.hidden = +b.getAttribute("data-for") !== i; });
        var lines = ["In this sample I can " + f.can + ". On your Mac, ask me anything.", "Your change stays. I'll learn from how you wrote it."];
        Object.keys(f.moves).forEach(function (k) {
          var m = f.moves[k];
          lines.push(typeof m.done === "function" ? m.done() : m.done);
        });
        if (f.stack) lines.push(lowDone(), cap(lamp.say) + " keeps 33% now. That's under 50%, so it's highlighted.");
        lines.forEach(function (t) {
          saysText.textContent = t;
          h = Math.max(h, pop.offsetHeight);
        });
      });
      saysText.textContent = "";
      keep.kids.forEach(function (k) { saysText.appendChild(k); });
      moveBtns.forEach(function (b, k) { b.hidden = keep.moves[k]; });
      says.hidden = keep.says;
      undoBtn.hidden = keep.undo;
      pop.hidden = keep.hidden;
      pop.style.visibility = keep.vis;
      // and the gap above "Ask Pip anything…", which takes up the slack
      pop.style.minHeight = Math.ceil(h + 12) + "px";
    }
    // Six tabs that don't fit on one line go three and three, never one on
    // its own; narrower than that, in two columns, as on a phone
    var tabList = $(".pp-tabs", root);
    function fitTabs() {
      tabList.classList.remove("is-split", "is-grid");
      if (root.clientWidth <= 640) return;
      var gap = parseFloat(getComputedStyle(tabList).columnGap) || 0;
      var w = tabs.map(function (t) { return t.offsetWidth; });
      function line(a) { return a.reduce(function (sum, x) { return sum + x; }, 0) + gap * (a.length - 1); }
      if (line(w) <= tabList.clientWidth) return;
      tabList.classList.add(Math.max(line(w.slice(0, 3)), line(w.slice(3))) <= tabList.clientWidth ? "is-split" : "is-grid");
    }
    function fit() { fitDoc(); fitTabs(); fitPop(); measureNote(); }

    /* ── the play-through: draft the newsletter, then the costs ───────────── */

    function moveEl(move) { return $('[data-move="' + move + '"]', root); }
    function resetAll() {
      stopAll();
      instantly(function () { FILES.forEach(function (f) { f.reset(); }); });
      busy = null; hist = []; said = null; hotMove = null; typing = false;
      show(0);
      pp.close();
      pp.resetSteps();
    }
    function play() {
      pp.start(function () {
        resetAll();
        pp.hideHint();
        pp.later(function () { pp.moveTo(tabs[0], 46, 18); }, 250);
        pp.later(function () { pp.tap(); pick(0); }, 1050);
        pp.later(function () { pp.moveTo(moveEl("draft"), 76, 20); }, 1600);
        pp.later(function () { pp.tap(); press("draft", costsNext); }, 2400);
      });
      function costsNext() {
        if (!pp.auto) return;
        pp.later(function () { pp.moveTo(tabs[2], 34, 18); }, 700);
        pp.later(function () { pp.tap(); pick(2); }, 1500);
        pp.later(function () { pp.moveTo(moveEl("margin"), 90, 20); }, 2100);
        pp.later(function () { pp.tap(); press("margin", priceNext); }, 2900);
      }
      function priceNext() {
        if (!pp.auto) return;
        pp.later(function () { pp.moveTo(lamp.price, lamp.price.offsetWidth - 18, 26); }, 800);
        pp.later(function () { pp.tap(); typePrice(lamp, "£125", end); }, 1600);
      }
      function end() {
        pp.later(function () {
          pp.hint();
          pp.done();
          if (pp.isOpen()) pp.face.classList.remove("is-nudging");
        }, 1400);
      }
    }

    pp = pipPage(root, {
      play: play,
      onReplay: play,
      onMove: function (move) { press(move); },
      onUndo: undo,
      onAsk: ask,
      onOpen: function () {
        pp.scope(FILES[cur].scope);
        if (said) { pp.say(said.text, said.working); pp.showUndo(said.undo); }
        pp.hot(hotMove);
      },
      onStop: function () {
        // stopped part-way through typing a price: it lands at once
        if (typing) typed(lamp, "£125");
        pp.hint(FILES[cur].hint || null);
        pp.done();
        if (pp.isOpen()) pp.face.classList.remove("is-nudging");
      }
    });

    root.classList.add("is-ready");
    $$(".cvi", cv).forEach(function (c, i) { c.style.setProperty("--n", i); });
    $$(".pair", chart).forEach(function (p, i) { $$("i", p).forEach(function (b) { b.style.setProperty("--n", i); }); });
    slideEls.forEach(function (s, i) { s.style.setProperty("--n", i); });
    show(0);
    sums(false);
    fit();
    // With no play-through, Pip's moves for the open file are there from the start
    if (reduced()) pp.open();

    var lastW = root.clientWidth, queued = null;
    function refit() {
      clearTimeout(queued);
      // after pipPage has made room for an open pop-over (120ms)
      queued = setTimeout(function () { lastW = root.clientWidth; fit(); }, 160);
    }
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () { if (root.clientWidth !== lastW) refit(); }).observe(root);
    } else window.addEventListener("resize", refit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  }


  /* ── flow ──────────────────────────────────────────────────────────────────
     From a few ideas to a month of posts, on Pip's page: one job, start to
     finish, in your own files. The Social ideas note is yours to write in.
     Ask Pip (the move in the pop-over, or in your own words) and Pip reads
     the note, idea by idea, and makes the plan as a new table, which opens in
     its own tab beside the note. On the table Pip writes the captions, then
     picks the photos, each row by row in reading order, the faded row under
     the last whole one going last. A caption is underlined as Pip's until
     you change it, and then it's yours. Each change has Undo, newest first.
     Up to two ideas the visitor adds get early slots of their own. The
     play-through types the ideas in, asks Pip in the pop-over, has the
     captions written, and hands over. The dates are next month's Mondays,
     Wednesdays and Fridays. */

  function flow() {
    var root = $("[data-flow]");
    if (!root) return;
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

    var ideasBox = $("[data-flow-ideas]", root);
    var list = $("ul", ideasBox);
    var IDEAS = $$("li", list).map(function (li) { return li.textContent; });
    var tabs = { note: $('[data-flow-tab="note"]', root), plan: $('[data-flow-tab="plan"]', root) };
    var files = { note: $('[data-flow-file="note"]', root), plan: $('[data-flow-file="plan"]', root) };
    var grid = $(".flow-grid", root);
    var box = $(".flow-tblbox", root);
    var table = $("[data-flow-table]", root);
    var rows = $$(".flow-tr:not(.flow-th)", table);
    var caps = rows.map(function (r) { return $(".c-cap", r); });
    var pics = rows.map(function (r) { return $(".c-ph", r); });
    var more = $("[data-flow-more]", root);
    var compose = $("[data-pp-compose]", root);
    var input = $("input", compose);
    var send = $("button", compose);
    var QUESTION = "Can you turn these into a plan for " + month + "?";
    var END = "<b>Your turn:</b> ask Pip to pick the photos, or change a caption.";

    function norm(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, ""); }

    // The plan Pip makes from the five ideas, as the page has it
    var PLAN = rows.map(function (r) {
      var img = $("img", r);
      return { where: $(".c-where", r).textContent, post: $(".c-post", r).textContent, cap: $(".c-cap", r).textContent, src: img.getAttribute("src"), alt: img.getAttribute("alt") };
    });
    var KNOWN = IDEAS.map(norm);

    var plan = null;   // the rows Pip planned, once there's a plan
    var capBy = [];    // each row's caption: null (a gap), "pip" or "you"
    var picked = [];   // each row's photo: picked or not
    var cur = "note";  // the file on show
    var history = [];  // what Undo takes back, newest last
    var busy = null;   // Pip's change in flight: { finish(go) }
    var gen = 0;       // a newer change, or Play it again, stops an older one's timers
    var shown = 6;     // whole rows in view
    var arrive = 0, jotting = false, pp;

    table.setAttribute("aria-label", month + " posts");
    $$(".flow-tr", table).forEach(function (r, i) { r.style.setProperty("--n", i); });

    function wait(ms, fn) {
      var g = gen;
      setTimeout(function () { if (g === gen) fn(); }, reduced() ? 0 : ms);
    }
    function thinking(on) { setThinking(pp.face, on); }

    // Finish Pip's change in flight at once, so the next one starts clean
    function settle() {
      if (!busy) return;
      var b = busy;
      busy = null;
      gen++;
      b.finish(false);
    }

    /* The note's ideas as written now, one a line */
    function ideasNow() {
      var items = $$("li", ideasBox);
      var lines = items.length ? items.map(function (li) { return li.textContent; }) : ideasBox.innerText.split("\n");
      return lines.map(function (t) { return t.trim(); }).filter(function (t) { return norm(t); });
    }
    // An idea as a post's name: no shouting, a capital to start
    function postName(t) {
      var x = t.replace(/[!?.,;:]+/g, " ").replace(/\s+/g, " ").trim();
      if (x.length > 48) x = x.slice(0, 48).replace(/\s+\S*$/, "");
      return x.charAt(0).toUpperCase() + x.slice(1);
    }
    // The plan: the five ideas' posts, with up to two of the visitor's own
    // ideas in the early slots, where they show
    function makeRows() {
      var mine = ideasNow().filter(function (t) { return KNOWN.indexOf(norm(t)) < 0; }).slice(0, 2);
      var out = PLAN.slice();
      mine.forEach(function (t, k) {
        var post = postName(t);
        out.splice(1 + k * 2, 0, { where: k ? "Facebook" : "Instagram", post: post, cap: post + ". More on this soon.", src: null, mine: true });
      });
      return out.slice(0, rows.length);
    }

    /* The table: a caption is a gap, Pip's (underlined) or yours; a photo
       is a dashed frame until it's picked */
    function setCap(i, by, text) {
      var c = caps[i];
      capBy[i] = by;
      c.textContent = "";
      if (!by) { c.removeAttribute("contenteditable"); return; }
      c.appendChild(el("span", "pp-edit" + (by === "you" ? " is-yours" : ""), text));
      c.setAttribute("contenteditable", "true");
      c.setAttribute("spellcheck", "false");
    }
    function setPic(i, on) {
      picked[i] = on;
      pics[i].classList.toggle("is-empty", !on || !plan || !plan[i].src);
    }
    function paintPlan() {
      rows.forEach(function (r, i) {
        var e = plan[i], img = $("img", r);
        $(".c-where", r).textContent = e.where;
        $(".c-post", r).textContent = e.post;
        img.hidden = !e.src;
        if (e.src && img.getAttribute("src") !== e.src) { img.src = e.src; img.alt = e.alt; }
        r.classList.remove("is-filling");
        setCap(i, null);
        setPic(i, false);
      });
    }

    /* As many whole rows as the file has room for, then "N more" */
    function fitRows() {
      if (files.plan.hidden) return;
      var cs = getComputedStyle(box);
      var rowH = parseFloat(cs.getPropertyValue("--row-h")) || 54;
      var headH = parseFloat(cs.getPropertyValue("--head-h")) || 36;
      var ghostH = parseFloat(cs.getPropertyValue("--ghost-h")) || 30;
      shown = Math.max(1, Math.min(rows.length - 1, Math.floor((grid.clientHeight - headH - ghostH - 2) / rowH)));
      box.style.setProperty("--flow-rows", shown);
      more.textContent = (TOTAL - shown) + " more";
    }
    // The rows to fill one by one: those in view, then the faded one under
    // them last of all. Rows out of sight are filled at the end, at once.
    function inView(todo) { return todo.filter(function (i) { return i <= shown; }); }

    /* The file on show, its tab, and Pip's moves for it */
    function show(which, opening) {
      cur = which;
      ["note", "plan"].forEach(function (k) {
        tabs[k].setAttribute("aria-selected", k === which ? "true" : "false");
        files[k].hidden = k !== which;
      });
      pp.scope(which);
      $$(".pp-move", root).forEach(function (m) { m.hidden = m.getAttribute("data-for") !== which; });
      if (which === "plan") fitRows();
      if (opening && !reduced()) {
        var a = ++arrive;
        table.classList.remove("is-arriving");
        tabs.plan.classList.remove("is-new");
        void table.offsetWidth;
        table.classList.add("is-arriving");
        tabs.plan.classList.add("is-new");
        setTimeout(function () { if (a === arrive) { table.classList.remove("is-arriving"); tabs.plan.classList.remove("is-new"); } }, 900);
      }
    }

    function level() {
      if (!plan) return 1;
      if (picked.some(Boolean)) return 4;
      if (capBy.some(Boolean)) return 3;
      return 2;
    }
    function hintNow() {
      if (!plan) return null; // the page's own: add an idea, or ask Pip to plan it
      var c = capBy.some(Boolean), p = picked.some(Boolean);
      if (c && p) return "<b>Done:</b> a month of posts. Change anything you like.";
      if (c) return "<b>Underlined:</b> Pip's captions. Change any and it's yours.";
      if (p) return "<b>Your turn:</b> ask Pip to write the captions.";
      return "<b>New tab:</b> the plan Pip made. Ask Pip to write the captions.";
    }

    /* Pip reads the note, an idea at a time, and makes the plan: a new
       table, opened in a tab of its own beside the note */
    function makePlan(then) {
      show("note");
      pp.hot("plan");
      if (!ideasNow().length) { pp.say("Jot down a few ideas first, then ask me."); return; }
      var items = $$("li", ideasBox).filter(function (li) { return norm(li.textContent); });
      var i = 0;
      pp.step(2);
      pp.say("Reading Social ideas…", true);
      pp.showUndo(false);
      thinking(true);
      function finish(go) {
        items.forEach(function (li) { li.classList.remove("is-lit"); });
        plan = makeRows();
        paintPlan();
        history.push({ kind: "plan" });
        tabs.plan.hidden = false;
        show("plan", true);
        thinking(false);
        pp.step(2);
        var mine = plan.filter(function (e) { return e.mine; }).length;
        pp.say("Made a plan in a new table, " + month + " posts: three posts a week." + (mine > 1 ? " Your new ideas are in it too." : mine ? " Your new idea is in it too." : ""));
        pp.showUndo(true);
        pp.hint(hintNow());
        if (go && then) then();
      }
      busy = { finish: finish };
      function read() {
        items.forEach(function (li, k) { li.classList.toggle("is-lit", k === i); });
        if (i < items.length) { i++; wait(240, read); }
        else wait(160, function () { busy = null; finish(true); });
      }
      wait(450, read);
    }

    /* Pip writes each caption into its row, word by word */
    function writeCaptions(then) {
      var todo = rows.map(function (r, i) { return i; }).filter(function (i) { return !capBy[i]; });
      pp.hot("captions");
      if (!todo.length) { pp.say("The captions are written. Change any you like."); return; }
      var all = todo.length === rows.length, queue = inView(todo);
      pp.say("Writing the captions in your voice…", true);
      pp.showUndo(false);
      thinking(true);
      table.classList.add("is-writing");
      function finish(go) {
        table.classList.remove("is-writing");
        todo.forEach(function (i) { rows[i].classList.remove("is-filling"); setCap(i, "pip", plan[i].cap); });
        history.push({ kind: "captions", rows: todo });
        thinking(false);
        pp.step(3);
        pp.say((all ? "Wrote a caption for each post" : "Wrote the missing captions") + ", in your voice. Change any you like.");
        pp.showUndo(true);
        pp.hint(hintNow());
        if (go && then) then();
      }
      busy = { finish: finish };
      function next() {
        if (!queue.length) { wait(260, function () { busy = null; finish(true); }); return; }
        var i = queue.shift(), words = plan[i].cap.split(" "), k = 0;
        var span = el("span", "pp-edit");
        caps[i].textContent = "";
        caps[i].appendChild(span);
        rows[i].classList.add("is-filling");
        wait(90, function word() {
          span.textContent = words.slice(0, ++k).join(" ");
          if (k < words.length) wait(34, word);
          else wait(150, function () { rows[i].classList.remove("is-filling"); next(); });
        });
      }
      wait(600, next);
    }

    /* Pip picks a photo from your folders for each row in turn */
    function pickPhotos(then) {
      var todo = rows.map(function (r, i) { return i; }).filter(function (i) { return !picked[i]; });
      pp.hot("photos");
      if (!todo.length) { pp.say("Every post has its photo. Change any caption you like."); return; }
      var queue = inView(todo);
      pp.say("Picking photos from your folders…", true);
      pp.showUndo(false);
      thinking(true);
      table.classList.add("is-picking");
      function finish(go) {
        table.classList.remove("is-picking");
        todo.forEach(function (i) { rows[i].classList.remove("is-filling"); setPic(i, true); });
        history.push({ kind: "photos", rows: todo });
        thinking(false);
        pp.step(4);
        var none = todo.filter(function (i) { return !plan[i].src; }).map(function (i) { return "“" + plan[i].post + "”"; });
        pp.say(none.length
          ? "Picked photos from your folders. There wasn't one for " + none.join(" or ") + ", so " + (none.length > 1 ? "those are" : "that one's") + " yours to add."
          : "Picked a photo for each post from your folders.");
        pp.showUndo(true);
        pp.hint(hintNow());
        if (go && then) then();
      }
      busy = { finish: finish };
      function next() {
        if (!queue.length) { wait(260, function () { busy = null; finish(true); }); return; }
        var i = queue.shift();
        rows[i].classList.add("is-filling");
        wait(160, function () {
          setPic(i, true);
          wait(220, function () { rows[i].classList.remove("is-filling"); next(); });
        });
      }
      wait(500, next);
    }

    /* A move, from the pop-over or in words. The table's moves need a plan
       first, so Pip makes one and carries on. */
    function run(kind, then) {
      settle();
      if (kind === "plan") {
        if (plan) { show("plan"); pp.say("Your plan's already here, in " + month + " posts."); return; }
        makePlan(then);
        return;
      }
      if (!plan) { makePlan(function () { run(kind, then); }); return; }
      if (cur !== "plan") show("plan");
      if (kind === "captions") writeCaptions(then); else pickPhotos(then);
    }
    function moveFrom(words) {
      var w = words.toLowerCase();
      if (/photo|picture|image|\bpics?\b/.test(w)) return "photos";
      if (/caption/.test(w)) return "captions";
      if (/plan|schedul|calendar|organi[sz]e|turn (these|them|this|it)|month|posts|table/.test(w)) return "plan";
      if (/write|words|copy|text/.test(w)) return "captions";
      return null;
    }
    function ask(words, then) {
      var m = moveFrom(words);
      if (m) run(m, then);
      else pp.say("In this sample I can plan your posts, write the captions and pick the photos. On your Mac, ask me anything.");
    }

    /* Undo takes back Pip's newest change. A caption you've changed stays. */
    function undo() {
      settle();
      var h = history.pop();
      if (!h) return;
      pp.hot(null);
      if (h.kind === "plan") {
        plan = null;
        tabs.plan.hidden = true;
        show("note");
        pp.say("Took the plan away. Your note is just as you wrote it.");
      } else if (h.kind === "captions") {
        var kept = 0;
        h.rows.forEach(function (i) { if (capBy[i] === "pip") setCap(i, null); else if (capBy[i]) kept++; });
        show("plan");
        pp.say(kept ? "Took my captions out. Yours stay." : "Took the captions out.");
      } else {
        h.rows.forEach(function (i) { setPic(i, false); });
        show("plan");
        pp.say("Took the photos out.");
      }
      pp.showUndo(history.length > 0);
      pp.resetSteps();
      pp.step(level());
      pp.hint(hintNow());
    }

    // Writing in a caption makes it yours
    table.addEventListener("input", function (e) {
      var i = caps.indexOf(e.target.closest ? e.target.closest(".c-cap") : null);
      if (i < 0 || capBy[i] === "you") return;
      capBy[i] = "you";
      $$(".pp-edit", caps[i]).forEach(function (s) { s.classList.add("is-yours"); });
      pp.hint("<b>Yours now.</b> Change another caption, or ask Pip.");
      if (pp.isOpen()) { pp.say("Your change stays. I'll learn from how you wrote it."); pp.showUndo(false); }
    });
    // A caption is one line: Return finishes it
    table.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && caps.indexOf(e.target) > -1) { e.preventDefault(); e.target.blur(); }
    });
    // Pasted words come in as plain text, in the note and in a caption
    root.addEventListener("paste", function (e) {
      var host = e.target.closest ? e.target.closest("[contenteditable]") : null;
      if (!host || !e.clipboardData) return;
      e.preventDefault();
      var text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, caps.indexOf(host) > -1 ? text.replace(/\s+/g, " ") : text);
    });
    ideasBox.addEventListener("input", function () { pp.stop(); pp.step(1); });
    input.addEventListener("input", function () { pp.stop(); });
    ["note", "plan"].forEach(function (k) {
      tabs[k].addEventListener("click", function () {
        pp.stop();
        if (cur === k) return;
        settle();
        show(k);
        pp.hot(null);
      });
    });

    /* Back to the start: the note empty, no plan, Pip closed */
    function reset() {
      gen++;
      busy = null;
      history = [];
      plan = null;
      capBy = [];
      picked = [];
      thinking(false);
      table.classList.remove("is-writing", "is-picking");
      tabs.plan.hidden = true;
      show("note");
      ideasBox.textContent = "";
      list = el("ul");
      ideasBox.appendChild(list);
      input.value = "";
      compose.classList.remove("is-typing");
      pp.close();
      pp.resetSteps();
      pp.hint();
    }

    /* The play-through: you jot the ideas down, ask Pip in the pop-over, Pip
       makes the plan, and the captions get written. Then it's your turn. */
    function play() {
      pp.start(function () {
        reset();
        pp.hideHint();
        var caret = el("i", "pp-caret"), i = 0;
        jotting = true;
        function idea() {
          var li = el("li"), text = IDEAS[i], n = 0;
          list.appendChild(li);
          (function key() {
            n = Math.min(text.length, n + 2);
            li.textContent = text.slice(0, n);
            li.appendChild(caret);
            pp.step(1);
            if (n < text.length) pp.later(key, 26);
            else if (++i < IDEAS.length) pp.later(idea, 170);
            else pp.later(askPip, 600);
          })();
        }
        function askPip() {
          jotting = false;
          caret.remove();
          pp.moveTo(pp.face, 26, 26);
          pp.later(function () { pp.tap(); pp.open(); }, 850);
          pp.later(function () { pp.moveTo(input, 48, 16); }, 1350);
          pp.later(function () { pp.tap(); compose.classList.add("is-typing"); typeQ(1); }, 2150);
        }
        function typeQ(n) {
          input.value = QUESTION.slice(0, n);
          input.scrollLeft = input.scrollWidth;
          if (n < QUESTION.length) { pp.later(function () { typeQ(n + 1); }, 32); return; }
          pp.later(function () { pp.moveTo(send); }, 250);
          pp.later(function () {
            pp.tap();
            input.value = "";
            compose.classList.remove("is-typing");
            ask(QUESTION, carryOn);
            // then watch the note as Pip reads it
            pp.later(function () { pp.moveTo(list, list.getBoundingClientRect().width * 0.55, 44); }, 500);
          }, 1000);
        }
        function carryOn() {
          if (!pp.auto) return;
          var move = $('[data-move="captions"]', root);
          pp.later(function () { pp.moveTo(move, 70, 19); }, 700);
          pp.later(function () { pp.tap(); run("captions", finish); }, 1500);
          pp.later(function () { pp.moveTo(caps[1], caps[1].getBoundingClientRect().width * 0.5, 16); }, 2000);
        }
        function finish() {
          if (!pp.auto) return;
          pp.later(function () {
            pp.hint(END);
            pp.done();
            pp.face.classList.remove("is-nudging"); // Pip's already open
          }, 700);
        }
        pp.later(idea, 350);
      });
    }

    pp = pipPage(root, {
      play: play,
      onReplay: play,
      onMove: function (move) { run(move); },
      onUndo: undo,
      onAsk: function (words) { ask(words); },
      onOpen: function () { pp.scope(cur); },
      onStop: function () {
        var c = $(".pp-caret", root);
        if (c) c.remove();
        // stopped part-way through the ideas: put them all in at once
        if (jotting) {
          jotting = false;
          list.textContent = "";
          IDEAS.forEach(function (t) { list.appendChild(el("li", "", t)); });
        }
        // …or through the question: it's there to send
        if (input.value && QUESTION.indexOf(input.value) === 0) input.value = QUESTION;
        compose.classList.remove("is-typing");
        pp.hint(hintNow());
        pp.done();
        if (pp.isOpen()) pp.face.classList.remove("is-nudging");
      }
    });
    // Any key in the stage takes over from the play-through too
    root.addEventListener("keydown", function () { pp.stop(); }, true);

    root.classList.add("is-ready");
    tabs.plan.hidden = true;
    show("note");

    if ("ResizeObserver" in window) new ResizeObserver(fitRows).observe(grid);
    else window.addEventListener("resize", fitRows);
    // Warm the photos before anyone asks for them
    onceVisible(root, function () {
      rows.forEach(function (r) { var img = $("img", r); if (img) { var pre = new Image(); pre.src = img.currentSrc || img.src; } });
    }, 0);
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
    var more = $("[data-signup-more]", root);
    var done = $("[data-signup-done]", root);
    var error = $("[data-signup-error]", root);
    var moreError = $("[data-signup-more-error]", root);
    var btn = $("[data-signup-btn]", root);
    var moreBtn = $("[data-signup-more-btn]", root);
    var skip = $("[data-signup-skip]", root);
    var saved = $("[data-signup-saved]", root);
    var levelSay = $("[data-ai-level-text]", root);
    var thanks = $("[data-signup-thanks]", root);
    var next = $("[data-signup-next]", root);
    var endpoint = form.getAttribute("data-endpoint");
    var moreEndpoint = endpoint ? endpoint.replace(/join_waitlist$/, "waitlist_more") : "";
    var key = form.getAttribute("data-key");
    // The review copy can't reach the database, so it plays the replies
    var preview = form.hasAttribute("data-preview");
    var busy = false, code = null, who = null;
    var LEVELS = ["Never tried it", "Tried it once or twice", "Use it now and then", "Use it most weeks", "Use it every day"];
    var ENDS = levelSay ? levelSay.innerHTML : "";
    // form.name is the form's own name, so reach the fields through elements
    var f = function (n) { return form.elements.namedItem(n); };
    var m = function (n) { return more.elements.namedItem(n); };

    function post(url, body) {
      if (preview) {
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve({ ok: true, status: 200, json: function () { return Promise.resolve("preview"); } });
          }, 650);
        });
      }
      return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: key },
        body: JSON.stringify(body)
      });
    }

    function failIn(box, text, withEmail) {
      box.textContent = text;
      if (withEmail) {
        box.appendChild(document.createTextNode(" "));
        var a = el("a", "", CONTACT);
        a.href = "mailto:" + CONTACT;
        box.appendChild(a);
        box.appendChild(document.createTextNode(" and I'll add you myself."));
      }
      box.hidden = false;
    }
    function busyOn(b, text) { busy = true; b.setAttribute("aria-busy", "true"); b.dataset.label = b.textContent; b.textContent = text; }
    function busyOff(b) { busy = false; b.removeAttribute("aria-busy"); if (b.dataset.label) b.textContent = b.dataset.label; }
    function first(name) { return name.split(/\s+/)[0]; }

    // Step 2: the place is saved; three optional questions
    function askMore() {
      saved.textContent = "You're on the list, " + first(who.name) + ".";
      form.hidden = true;
      more.hidden = false;
      more.focus({ preventScroll: true });
    }
    // Done, with or without the answers
    function finish(answered) {
      thanks.textContent = answered ? "Thanks, " + first(who.name) + ". That really helps." : "Thanks, " + first(who.name) + ". You're on the list.";
      next.textContent = "I'll email you at " + who.email + " when your place is ready. Keep an eye out for an email from Hayden at Pip.";
      form.hidden = true;
      more.hidden = true;
      done.hidden = false;
      done.focus({ preventScroll: true });
    }

    // Step 1: name and email, and the place is saved
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy) return;
      error.hidden = true;
      var name = f("name").value.trim();
      var email = f("email").value.trim();
      f("name").setAttribute("aria-invalid", name ? "false" : "true");
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      f("email").setAttribute("aria-invalid", emailOk ? "false" : "true");
      if (!name) { failIn(error, "Please add your name."); f("name").focus(); return; }
      if (!emailOk) { failIn(error, "That email doesn't look quite right."); f("email").focus(); return; }
      who = { name: name, email: email };
      if (f("website").value) { finish(false); return; } // a bot filled the hidden field
      if (!endpoint || (!preview && !window.fetch)) { failIn(error, "Sorry, sign-ups aren't working here yet. Email me at", true); return; }
      busyOn(btn, "Saving…");
      // join_waitlist answers the same for a new email and one already on the
      // list (a code either way), so nobody can use the form to check who has
      // signed up
      post(endpoint, { p_name: name, p_email: email }).then(function (r) {
        if (!r.ok) {
          if (r.status === 400) failIn(error, "That didn't look quite right. Check your name and email, or email me at", true);
          else failIn(error, "Sorry, that didn't save. Try again, or email me at", true);
          return;
        }
        return r.json().then(function (c) { code = c; }, function () { code = null; }).then(askMore);
      }, function () {
        failIn(error, "Sorry, that didn't send. Check your connection and try again, or email me at", true);
      }).then(function () { busyOff(btn); });
    });

    // The scale says what the number means once one is picked
    if (levelSay) {
      more.addEventListener("change", function (e) {
        if (e.target.name !== "ai_level") return;
        levelSay.textContent = LEVELS[+e.target.value - 1];
        levelSay.classList.add("is-chosen");
      });
    }

    function picked(name) {
      var on = $('input[name="' + name + '"]:checked', more);
      return on ? on.value : null;
    }

    more.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy) return;
      moreError.hidden = true;
      var about = m("about").value.trim();
      var level = picked("ai_level");
      var pays = picked("ai_pays");
      if (!about && !level && !pays) { finish(false); return; }
      if (!code) { finish(false); return; }
      busyOn(moreBtn, "Sending…");
      post(moreEndpoint, { p_token: code, p_about: about || null, p_ai_level: level ? +level : null, p_ai_pays: pays })
        .then(function (r) {
          if (r.ok) finish(true);
          else failIn(moreError, "Sorry, those didn't save. Your place is saved either way, so you can skip them.");
        }, function () {
          failIn(moreError, "Sorry, those didn't send. Your place is saved either way, so you can skip them.");
        })
        .then(function () { busyOff(moreBtn); });
    });
    skip.addEventListener("click", function () { if (!busy) finish(false); });

    // Back to the start if the page is shown again from the cache
    window.addEventListener("pageshow", function (e) {
      if (!e.persisted) return;
      form.hidden = false; more.hidden = true; done.hidden = true;
      if (levelSay) { levelSay.innerHTML = ENDS; levelSay.classList.remove("is-chosen"); }
    });
  }


  /* ── start ─────────────────────────────────────────────────────────────────
     Each module runs on its own, so one failing never stops the rest.
     PIP_READY tells the inline guard in <head> that reveals are handled. */

  [pageTop, dates, stops, header, mascots, reveal, inView, peek, scenes, takeover, playground, jobs, flow, accordion, jumpList, signup].forEach(function (init) {
    try { init(); } catch (err) {
      if (window.console && console.error) console.error("pip site:", err);
    }
  });
  window.PIP_READY = true;
})();
