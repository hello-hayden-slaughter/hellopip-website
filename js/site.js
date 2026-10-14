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
     scenes     the vignette moments: yours, briefed, switch
     takeover   "Go on, have a play": the real Pip, full screen, on request
     jobs       the six one-click jobs
     accordion  questions that open with height and fade
     jumpList   the questions page's group list
     download   arch detection and the latest release from GitHub

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
     its end state, and offers Reset (a quiet button under the window, named by
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
     with a mouse, his pupils drift toward the cursor. The idle gaze is kept:
     the offset is added to his resting pupils, never centred. Off under
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

  /* It's your page: Pip's bar sits under the note the whole time, the way it
     does in the jobs window. It offers; "Yes, tighten it" sweeps a wash over
     paragraph two, strikes the old words through and types the new ones in;
     then the button becomes Undo. Undo puts her words back, and Pip offers
     again. The note never changes height: it's measured at its edited size. */
  function sceneYours() {
    var root = $('[data-scene="yours"]');
    if (!root) return;
    var body = $("[data-note-body]", root);
    var typed = $("[data-typed]", root);
    var rest = $("[data-rest]", root);
    var label = $("[data-edit-label]", root);
    var labelText = $("span", label);
    var dot = $(".nlab-dot", label);
    var msg = $("[data-yours-msg]", root);
    var faceHolder = $("[data-yours-face]", root);
    var goBtn = $("[data-yours-go]", root);
    var undoBtn = $("[data-yours-undo]", root);
    var NEW = typed.textContent;
    var STATES = ["is-before", "is-washed", "is-struck", "is-typing-in", "is-edited"];
    var COPY = {
      offer: "That second paragraph runs on a bit. Want me to tighten it?",
      again: "Back to your words. Want me to reword that paragraph?",
      busy: "Tightening that paragraph…",
      done: "Changed that paragraph. The rest is yours, untouched."
    };
    var run = 0;

    function setWords(n) {
      typed.textContent = NEW.slice(0, n);
      rest.textContent = NEW.slice(n);
    }
    function setState(cls) {
      STATES.forEach(function (c) { root.classList.remove(c); });
      if (cls) cls.split(" ").forEach(function (c) { root.classList.add(c); });
    }
    function setLabel(pip) {
      labelText.textContent = pip ? "Pip's edit" : "your words";
      dot.hidden = !pip;
    }
    function say(text) {
      msg.classList.remove("is-busy");
      setThinking(faceHolder, false);
      swapText(msg, text);
    }
    function before(text) {
      run++;
      setState("is-before");
      setLabel(false);
      setWords(0);
      say(text);
      goBtn.textContent = text === COPY.offer ? "Yes, tighten it" : "Yes, reword it";
      goBtn.hidden = false;
      undoBtn.hidden = true;
    }
    function edited() {
      setState("is-edited");
      setLabel(true);
      setWords(NEW.length);
      say(COPY.done);
      goBtn.hidden = true;
      undoBtn.hidden = false;
    }

    // Hold the note at its edited height, so nothing below it ever moves
    function measure() {
      body.style.minHeight = "";
      var was = root.className;
      setState("is-edited");
      setWords(NEW.length);
      var h = body.getBoundingClientRect().height;
      root.className = was;
      if (!root.classList.contains("is-edited")) setWords(root.classList.contains("is-typing-in") ? typed.textContent.length : 0);
      body.style.minHeight = Math.ceil(h) + "px";
    }

    function tighten() {
      var id = ++run;
      goBtn.hidden = true;
      undoBtn.hidden = true;
      if (reduced()) { edited(); undoBtn.focus(); return; }
      setThinking(faceHolder, true);
      msg.textContent = "";
      msg.classList.add("is-busy");
      msg.appendChild(dots());
      msg.appendChild(el("span", "", COPY.busy));
      var sleep = function (ms) {
        return new Promise(function (resolve, reject) {
          setTimeout(function () { if (id === run) resolve(); else reject(CANCELLED); }, ms);
        });
      };
      var i = 0;
      function type() {
        if (i >= NEW.length) return Promise.resolve();
        i += 1;
        setWords(i);
        var ch = NEW.charAt(i - 1);
        return sleep(ch === " " ? 42 : ch === "." || ch === "," ? 140 : 26 + Math.random() * 12).then(type);
      }
      sleep(240)
        .then(function () { root.classList.add("is-washed"); return sleep(700); })
        .then(function () { root.classList.add("is-struck"); return sleep(560); })
        .then(function () { root.classList.add("is-typing-in"); return type(); })
        .then(function () { return sleep(320); })
        .then(function () { edited(); undoBtn.focus({ preventScroll: true }); })
        .catch(function (err) { if (err !== CANCELLED) throw err; });
    }

    goBtn.addEventListener("click", tighten);
    undoBtn.addEventListener("click", function () {
      before(COPY.again);
      goBtn.focus({ preventScroll: true });
    });

    before(COPY.offer);
    measure();
    var resizeT = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(measure, 150);
    });
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
     sent; Pip says where he's looking, then answers with the note or table it
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

  /* Switch AI: Pip's chat with a conversation already going. The settings
     button opens Chat settings over the chat, the tick moves from Claude
     Sonnet to Claude Opus, it closes, and the chat carries on with a follow-up
     on the new model. Nothing in the conversation is lost. */
  function sceneSwitch() {
    var root = $('[data-scene="switch"]');
    if (!root) return;
    var steps = $$("[data-step]", root);
    var opts = $$("[data-sheet-models] .copt", root);
    var tune = $("[data-tune]", root);
    var box = composer(root);
    var DEFAULT = 0, PICK = 3; // Pip default (Claude Sonnet 5) → Claude Opus 5.5

    function choose(i) { opts.forEach(function (o, k) { o.classList.toggle("is-on", k === i); }); }
    function clear() {
      steps.forEach(function (s) { s.classList.remove("is-shown", "is-thinking", "is-answered"); });
      root.classList.remove("is-open");
      tune.classList.remove("is-on");
      box.reset();
    }

    createScene(root, {
      start: function () { clear(); choose(DEFAULT); root.classList.add("is-pre"); },
      play: function (sleep) {
        var line = steps[0], q = steps[1], a = steps[2];
        return sleep(600)
          .then(function () { tune.classList.add("is-on"); return sleep(260); })
          .then(function () { root.classList.add("is-open"); return sleep(1500); })
          .then(function () { opts[PICK].classList.add("is-hover"); return sleep(520); })
          .then(function () { opts[PICK].classList.remove("is-hover"); choose(PICK); return sleep(900); })
          .then(function () { root.classList.remove("is-open"); tune.classList.remove("is-on"); return sleep(420); })
          .then(function () { line.classList.add("is-shown"); return sleep(900); })
          .then(function () { return box.type(q.textContent, sleep); })
          .then(function () { return sleep(400); })
          .then(function () { box.send(); q.classList.add("is-shown"); return sleep(500); })
          .then(function () { a.classList.add("is-shown", "is-thinking"); return sleep(1300); })
          .then(function () { a.classList.remove("is-thinking"); a.classList.add("is-answered"); return sleep(300); });
      },
      end: function () { clear(); choose(PICK); root.classList.remove("is-pre"); }
    });
  }

  /* See what Pip knows: "How does Pip know this?" opens the note it came from */
  function knows() {
    var btn = $(".kitem-why");
    var why = btn && document.getElementById(btn.getAttribute("aria-controls"));
    if (!why) return;
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      why.hidden = !open;
      if (open && !reduced() && why.animate) {
        why.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 150, easing: EASE_OUT });
      }
    });
  }

  function scenes() {
    knows();
    sceneYours();
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
    var shot = $(".demo-shot img", play);
    var panel = $("[data-takeover-panel]", dlg);
    var stage = $("[data-takeover-stage]", dlg);
    var waitText = $("[data-takeover-wait-text]", dlg);
    var closeBtn = $("[data-takeover-close]", dlg);
    if (!src || !go || !window.matchMedia) return;
    var origin;
    try { origin = new URL(src, location.href).origin; } catch (e) { return; }
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
      stage.appendChild(frame);
      fit();
    }

    window.addEventListener("message", function (e) {
      if (e.origin !== origin || !e.data || e.data.type !== "pip-demo:ready") return;
      ready = true;
      clearTimeout(slowTimer);
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
        slowTimer = setTimeout(function () { if (!ready) waitText.textContent = "Still opening. Pip needs a moment on a slow connection."; }, 9000);
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

  /* ── jobs ──────────────────────────────────────────────────────────────────
     Six things you've made, and what each could become. Pick a job on the
     left; the window changes in place (old out 100ms, new in 150ms, frame
     fixed). Pip offers; "Yes, …" plays the transformation; Reset shows the
     before again. Two jobs hand you one decision first. */

  function jobs() {
    var win = $("#jobs-win");
    if (!win) return;

    var RATES = [15, 20, 25];
    var JOBS = [
      { title: "Lume Lighting › Newsletter: " + D.month, intro: "You've got this month's news as rough notes. Want a first draft of the newsletter, in your words?", go: "Yes, draft it", done: "Drafted from your notes, in your tone. The dates and prices came straight from them, so they're the bit to check." },
      { title: "Lume Lighting › sage-slim-lamp.jpg", intro: "There's a plant, a notepad and a laptop around the lamp. Want me to take the background out, brighten it and make it square for the shop?", go: "Yes, clean it up", done: "Background out, a little brighter, and square for the listing. Your original is still there if you want it back." },
      { title: "Lume Lighting › Costs: large scallop", intro: "I can add up what a large scallop costs you to make. I'll need one number from you first.", go: "Yes, add it up",
        ask: {
          q: "What's an hour of your time worth?",
          opts: ["£15", "£20", "£25"],
          apply: function (i) {
            var rate = RATES[i];
            addRow(["Your time, 3 hours at £" + rate, "£" + (3 * rate) + ".00", ""]);
            later(function () { addRow(["To make and send", "£" + (50 + 3 * rate) + ".00", "is-total"]); }, 380);
          },
          after: function (i) { return "£" + (50 + 3 * RATES[i]) + " to make and send. Your large scallop sells for £350, so the margin's there. The price is your call."; }
        } },
      { title: "Lume Lighting › Drum workshop steps", intro: "You've got the steps for Sunday. Want them as a deck?", go: "Yes, make the deck", done: "Six slides, one for each step, with your step photos in. Move anything you like." },
      { title: "Lume Lighting › Spring collection · Canvas", intro: "Your ideas for spring are all over the place. Want me to group them?", go: "Yes, group them",
        ask: {
          q: "Which fabric leads the spring collection?",
          opts: ["Green leaf linen", "Dotted cotton", "Striped linen"],
          apply: function (i) {
            $$(".cvi--sw", win).forEach(function (s) { s.classList.toggle("is-chosen", +s.getAttribute("data-fabric") === i); });
          },
          after: function (i) { return this.opts[i] + " leads, then. One gap to fill: the 60cm scallop has no price yet."; }
        } },
      { title: "Lume Lighting › Sales " + D.salesYear, intro: "This is your sales sheet, month by month. Want a chart of it, and a dashboard you can keep?", go: "Yes, show me", done: "Here's one you might have missed: workshops made 43% of sales this year, up from 22% last year." }
    ];
    var NL = [
      "Hello, and thank you for such a lovely summer at the studio.",
      "The mustard scallop is finally in the shop. It's the linen I've been saving for months, and as always there's only one.",
      "Two places left on the drum workshop on " + D.long(D.drum) + ", so bring a fabric you love. And the lino printing day is open for " + D.long(D.lino) + ": six places, £110, and you take your printed shade home.",
      "The last posting day for Christmas is " + D.dayMonth(D.xmas) + ".",
      "Speak soon."
    ];
    var ADDED = [["Materials", "£38.00", "is-sub"], ["Courier", "£12.00", ""]];

    var jobBtns = $$(".job", win);
    var surfs = $$(".surf", win);
    var title = $("#jobs-title");
    var msg = $("#jobs-msg");
    var faceHolder = $("#jobs-face");
    var opts = $("#jobs-opts");
    var goBtn = $("#jobs-go");
    var resetBtn = $("#jobs-reset");
    var nextBtn = $("#jobs-next");
    var nextLabel = $("span", nextBtn);
    var nl = $("#nl-text");
    var NL_ROUGH = nl.innerHTML;
    var photo = $("#photo-job");
    var tools = $$(".ptool", photo);
    var costBody = $("#cost-tbl tbody");
    var slides = $("#slides");
    var cv = $("#cv");
    var dash = $("#dash");
    var chart = $(".chart", dash);
    var tiles = $$(".tile-v", dash);

    var cur = 0, shown = 0, busy = false;
    var done = [false, false, false, false, false, false];
    var chosen = [null, null, null, null, null, null];
    var timers = [];
    var swapping = null;

    surfs.forEach(function (s, i) { s.hidden = i !== 0; });
    win.classList.add("is-ready");
    $$(".slide-face", slides).forEach(function (s, i) { s.style.setProperty("--n", i); });
    $$(".cvi", cv).forEach(function (c, i) { c.style.setProperty("--n", i); });
    $$(".pair", chart).forEach(function (p, i) { $$("i", p).forEach(function (b) { b.style.setProperty("--n", i); }); });

    function later(fn, ms) { timers.push(setTimeout(fn, reduced() ? 0 : ms)); }

    function addRow(r) {
      var tr = el("tr", "is-new" + (r[2] ? " " + r[2] : ""));
      tr.appendChild(el("td", "", r[0]));
      tr.appendChild(el("td", "", r[1]));
      costBody.appendChild(tr);
    }

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

    function setMessage(text) {
      msg.classList.remove("is-busy");
      setThinking(faceHolder, false);
      swapText(msg, text);
    }

    function setBusy() {
      setThinking(faceHolder, true);
      msg.textContent = "";
      msg.classList.add("is-busy");
      msg.appendChild(dots());
      msg.appendChild(el("span", "", "Pip is working…"));
    }

    function paint() {
      var j = JOBS[cur];
      var pending = !!(done[cur] && j.ask && chosen[cur] === null);
      jobBtns.forEach(function (b, i) {
        b.classList.toggle("is-on", i === cur);
        b.setAttribute("aria-pressed", i === cur ? "true" : "false");
        b.classList.toggle("is-done", done[i] && !(JOBS[i].ask && chosen[i] === null));
      });
      showSurf(cur);
      swapText(title, j.title);
      if (busy) setBusy();
      else setMessage(pending ? j.ask.q : done[cur] ? (j.ask ? j.ask.after(chosen[cur]) : j.done) : j.intro);

      goBtn.textContent = j.go;
      goBtn.hidden = busy || done[cur];
      opts.textContent = "";
      opts.hidden = !pending;
      if (pending) {
        j.ask.opts.forEach(function (o, k) {
          var b = el("button", "btn btn--secondary btn--xs", o);
          b.type = "button";
          b.addEventListener("click", function () {
            chosen[cur] = k;
            if (j.ask.apply) j.ask.apply(k);
            paint();
            nextBtn.focus();
          });
          opts.appendChild(b);
        });
      }
      resetBtn.hidden = nextBtn.hidden = busy || !done[cur] || pending;
      nextLabel.textContent = cur === JOBS.length - 1 ? "Back to the first job" : "Next job";
    }

    function finish() {
      busy = false;
      done[cur] = true;
      paint();
      var first = $("button", opts);
      if (first) first.focus();
      else if (!nextBtn.hidden) nextBtn.focus();
    }

    function countUp(nodes, duration, then) {
      var t0 = null;
      function frame(ts) {
        if (t0 === null) t0 = ts;
        var k = reduced() ? 1 : Math.min(1, (ts - t0) / duration);
        var eased = 1 - Math.pow(1 - k, 3);
        nodes.forEach(function (b) {
          b.textContent = (b.getAttribute("data-pre") || "") + Math.round(+b.getAttribute("data-to") * eased).toLocaleString("en-GB") + (b.getAttribute("data-suf") || "");
        });
        if (k < 1) requestAnimationFrame(frame); else then();
      }
      requestAnimationFrame(frame);
    }

    var DO = [
      function () { // the newsletter drafts in, from the rough notes, in place
        nl.classList.add("is-leaving");
        later(function () {
          nl.classList.remove("is-leaving");
          nl.textContent = "";
          NL.forEach(function (text, n) {
            var p = el("p", "is-new", text);
            p.style.setProperty("--n", n);
            nl.appendChild(p);
          });
        }, 110);
        later(finish, 110 + NL.length * 110 + 340);
      },
      function () { // background out, brighter, square
        var steps = [["clean", "is-clean"], ["bright", "is-bright"], ["square", "is-square"]];
        steps.forEach(function (s, n) {
          later(function () {
            tools.forEach(function (t) { if (t.classList.contains("is-active")) { t.classList.remove("is-active"); t.classList.add("is-done"); } });
            $('[data-tool="' + s[0] + '"]', photo).classList.add("is-active");
            photo.classList.add(s[1]);
          }, n * 700);
        });
        later(function () {
          tools.forEach(function (t) { t.classList.remove("is-active"); t.classList.add("is-done"); });
          finish();
        }, 2100);
      },
      function () { // add up what we know, then ask for the one number we don't
        ADDED.forEach(function (r, n) { later(function () { addRow(r); }, n * 380); });
        later(finish, ADDED.length * 380 + 200);
      },
      function () { // the slides are dealt into their frames
        slides.classList.add("is-built");
        later(finish, 6 * 90 + 520);
      },
      function () { // the ideas regroup
        cv.classList.add("is-sorted");
        later(finish, 640 + 8 * 40 + 200);
      },
      function () { // the sheet becomes a dashboard
        dash.classList.add("is-shown");
        later(function () {
          chart.classList.add("is-grown");
          countUp(tiles, 900, finish);
        }, 360);
      }
    ];

    var UNDO = [
      function () { nl.innerHTML = NL_ROUGH; nl.classList.remove("is-leaving"); },
      function () { photo.classList.remove("is-clean", "is-bright", "is-square"); tools.forEach(function (t) { t.classList.remove("is-active", "is-done"); }); },
      function () { $$("tr.is-new", costBody).forEach(function (r) { r.remove(); }); },
      function () { slides.classList.remove("is-built"); },
      function () { cv.classList.remove("is-sorted"); $$(".is-chosen", cv).forEach(function (c) { c.classList.remove("is-chosen"); }); },
      function () {
        dash.classList.remove("is-shown");
        chart.classList.remove("is-grown");
        tiles.forEach(function (b) { b.textContent = (b.getAttribute("data-pre") || "") + "0" + (b.getAttribute("data-suf") || ""); });
      }
    ];

    goBtn.addEventListener("click", function () {
      if (busy || done[cur]) return;
      busy = true;
      paint();
      DO[cur]();
    });
    resetBtn.addEventListener("click", function () {
      if (busy) return;
      UNDO[cur]();
      done[cur] = false;
      chosen[cur] = null;
      paint();
      goBtn.focus();
    });
    nextBtn.addEventListener("click", function () {
      if (busy) return;
      cur = (cur + 1) % JOBS.length;
      paint();
      if (!goBtn.hidden) goBtn.focus();
    });
    jobBtns.forEach(function (b, i) {
      b.addEventListener("click", function () {
        if (busy || i === cur) return;
        cur = i;
        paint();
      });
    });

    paint();
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

  /* ── download ──────────────────────────────────────────────────────────────
     The big button finds this Mac's chip and the latest release on GitHub,
     and links straight to the right disk image. Without JavaScript, or if
     GitHub doesn't answer, it links to the releases page. A visit from a
     "Download" button elsewhere (?start=1) starts the download on a Mac. */

  var RELEASES_URL = "https://github.com/hello-hayden-slaughter/Pip-release/releases/latest";
  var RELEASE_API = "https://api.github.com/repos/hello-hayden-slaughter/Pip-release/releases/latest";

  function detectMacArch() {
    var fromHints = Promise.resolve(null);
    try {
      if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        fromHints = navigator.userAgentData.getHighEntropyValues(["architecture"]).then(function (ua) {
          if (ua.architecture === "arm") return "arm64";
          if (ua.architecture === "x86") return "x64";
          return null;
        }, function () { return null; });
      }
    } catch (e) { /* fall through to the renderer check */ }
    return fromHints.then(function (arch) {
      if (arch) return arch;
      try {
        var canvas = document.createElement("canvas");
        var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        if (gl) {
          var ext = gl.getExtension("WEBGL_debug_renderer_info");
          if (ext) {
            var r = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "");
            if (/\bApple\b/.test(r) && !/Intel/i.test(r)) return "arm64";
            if (/\bIntel\b/i.test(r)) return "x64";
            if (/\b(AMD|Radeon|ATI)\b/i.test(r)) return "x64";
          }
        }
      } catch (e) { /* unknown */ }
      return null;
    });
  }

  function pickDmg(assets, arch) {
    var arm = assets.filter(function (a) { return /-arm64\.dmg$/i.test(a.name); })[0];
    var x64 = assets.filter(function (a) { return /\.dmg$/i.test(a.name) && !/arm64|universal/i.test(a.name); })[0];
    if (arch === "x64") return x64 || arm;
    return arm || x64;
  }

  function download() {
    var root = $("[data-download]");
    if (!root) return;
    var btn = $("[data-dl-btn]", root);
    var label = $("[data-dl-label]", root);
    var chip = $("[data-dl-chip]", root);
    var swap = $("[data-dl-swap]", root);
    var again = $("[data-dl-again]");
    var COPY = {
      arm64: { chip: "This Mac has Apple silicon.", btn: "Download for Mac with Apple silicon", swap: "On an Intel Mac? Download the Intel version." },
      x64: { chip: "This Mac has an Intel chip.", btn: "Download for Mac with Intel", swap: "On a Mac with Apple silicon? Download that version." }
    };
    var isMac = /Macintosh|Mac OS X/.test(navigator.userAgent) && !(navigator.maxTouchPoints > 1);
    var arch = "arm64";
    var release = null;

    function asset() { return release ? pickDmg(release.assets || [], arch) : null; }

    function apply() {
      chip.textContent = COPY[arch].chip;
      label.textContent = COPY[arch].btn;
      swap.textContent = COPY[arch].swap;
      var dmg = asset();
      var href = dmg && dmg.browser_download_url ? dmg.browser_download_url : RELEASES_URL;
      btn.href = href;
      if (again) again.href = href;
      if (release) fillMeta(dmg);
    }

    function setMeta(key, text) {
      var slot = $('[data-release="' + key + '"]', root);
      if (slot && text) slot.textContent = text;
    }
    function fillMeta(dmg) {
      if (release.tag_name) setMeta("version", String(release.tag_name).replace(/^v/i, ""));
      if (dmg && dmg.size) setMeta("size", Math.round(dmg.size / 1048576) + " MB");
      if (release.published_at) {
        var d = new Date(release.published_at);
        if (!isNaN(d)) setMeta("date", d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));
      }
    }

    // A phone or a PC: the chip line describes a Mac, so leave it out
    if (!isMac) chip.hidden = true;

    swap.addEventListener("click", function () {
      arch = arch === "arm64" ? "x64" : "arm64";
      apply();
    });

    var archReady = (isMac ? detectMacArch() : Promise.resolve(null)).then(function (a) {
      if (a) { arch = a; apply(); }
    });
    var releaseReady = fetch(RELEASE_API, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (json) { release = json; apply(); });

    var wantsStart = /(?:^|[?&])start=1(?:&|$)/.test(location.search);
    if (wantsStart && history.replaceState) history.replaceState(null, "", location.pathname + location.hash);
    Promise.all([archReady, releaseReady]).then(function () {
      var dmg = asset();
      if (wantsStart && isMac && dmg && dmg.browser_download_url) window.location.href = dmg.browser_download_url;
    }).catch(function () { /* the button still links to the releases page */ });
  }


  /* ── start ─────────────────────────────────────────────────────────────────
     Each module runs on its own, so one failing never stops the rest.
     PIP_READY tells the inline guard in <head> that reveals are handled. */

  [dates, stops, header, mascots, reveal, scenes, takeover, jobs, accordion, jumpList, download].forEach(function (init) {
    try { init(); } catch (err) {
      if (window.console && console.error) console.error("pip site:", err);
    }
  });
  window.PIP_READY = true;
})();
