/* ==========================================================================
   Pip website · js/site.js
   Vanilla, no libraries, loaded with defer. One module per behaviour, each
   guarded on its own markup so every page can load the same file:

     util       helpers the modules share
     dates      every date in the examples, worked out from today
     header     the scrolled header and the phone menu sheet
     mascots    the live Pip: blink, and eyes that follow the cursor
     reveal     sections arriving on scroll
     scenes     the vignette moments: find, yours, briefed, switch
     demo       "have a play": the Lume listing sample
     liveDemo   on a laptop, the real Pip in a frame once it's ready
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
     its end state, and offers Replay. Under reduced motion it only ever shows
     the end state. scene = { start(), play(sleep), end() } */
  function createScene(root, scene) {
    var run = 0;
    var replay = $("[data-replay]", root);

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
     out from today: the drum workshop is the next Saturday at least four days
     away, the lino day three weeks after it, chats are so many days ago, and
     the sales sheet is this year's (last year's until April). The HTML holds
     a sensible fallback in each [data-date] span for when this doesn't run. */

  var D = (function () {
    var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var today = new Date(); today.setHours(12, 0, 0, 0);
    function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
    var drum = addDays(today, 4);
    while (drum.getDay() !== 6) drum = addDays(drum, 1);
    var lino = addDays(drum, 21);
    var xmas = new Date(today.getFullYear(), 11, 18, 12);
    if (today > xmas) xmas = new Date(today.getFullYear() + 1, 11, 18, 12);
    var prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    function long(d) { return DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()]; }
    function lower(d) { return (DAYS[d.getDay()].slice(0, 3) + " " + d.getDate() + " " + MONTHS[d.getMonth()].slice(0, 3)).toLowerCase(); }
    function short(d) { return d.getDate() + " " + MONTHS[d.getMonth()].slice(0, 3); }
    function dayMonth(d) { return d.getDate() + " " + MONTHS[d.getMonth()]; }
    return {
      drum: drum, lino: lino, xmas: xmas, long: long, lower: lower, short: short, dayMonth: dayMonth,
      month: MONTHS[today.getMonth()],
      monthPrev: MONTHS[prevMonth.getMonth()],
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
      else if (key === "year") text = D.year;
      else if (key === "sales-year") text = D.salesYear;
      else if (key.indexOf("ago:") === 0) text = D.ago(parseInt(key.slice(4), 10) || 0);
      if (text) node.textContent = text;
    });
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

  /* Find it again: the chat search keeps piling up "caption" chats while
     Pip's folders settle and the one note is simply there. */
  function sceneFind() {
    var root = $('[data-scene="find"]');
    if (!root) return;
    var list = $("[data-chats]", root);
    var count = $("[data-count]", root);
    var query = $("[data-query]", root);
    var pick = $("[data-pick]", root);
    var rows = $$(".chat-row", list).map(function (r) { return r.cloneNode(true); });
    var treeRows = $$(".tree--find .tree-row", root);
    var QUERY = query.textContent;
    var TOTAL = +count.textContent;
    treeRows.forEach(function (r, i) { r.style.setProperty("--n", i); });

    function fill(fromIndex) {
      list.textContent = "";
      rows.slice(fromIndex).forEach(function (r) { list.appendChild(r.cloneNode(true)); });
      count.textContent = String(TOTAL - fromIndex);
    }

    createScene(root, {
      start: function () {
        root.classList.add("is-pre");
        root.classList.remove("is-settling", "is-typing", "is-counted");
        fill(rows.length);
        query.textContent = "";
        pick.classList.remove("is-selected");
      },
      play: function (sleep) {
        var k = rows.length;
        var first = true;
        root.classList.add("is-settling", "is-typing");
        function type(i) {
          if (i > QUERY.length) return Promise.resolve();
          query.textContent = QUERY.slice(0, i);
          return sleep(70).then(function () { return type(i + 1); });
        }
        function pile() {
          if (k <= 0) return Promise.resolve();
          var wait = first ? 240 : 900;
          first = false;
          return sleep(wait).then(function () {
            k -= 1;
            var row = rows[k].cloneNode(true);
            row.classList.add("is-new");
            list.insertBefore(row, list.firstChild);
            count.textContent = String(TOTAL - k);
            return pile();
          });
        }
        sleep(treeRows.length * 40 + 260).then(function () { pick.classList.add("is-selected"); }, function () {});
        return type(1)
          .then(function () { root.classList.remove("is-typing"); root.classList.add("is-counted"); return pile(); })
          .then(function () { return sleep(400); });
      },
      end: function () {
        root.classList.remove("is-pre", "is-settling", "is-typing", "is-counted");
        fill(0);
        query.textContent = QUERY;
        pick.classList.add("is-selected");
      }
    });
  }

  /* It's your page: a selection wash sweeps paragraph two, the old words strike
     through, the new sentence types in, then Pip says so. Paragraphs one and
     three never move: the new words hold their space from the start. */
  function sceneYours() {
    var root = $('[data-scene="yours"]');
    if (!root) return;
    var typed = $("[data-typed]", root);
    var rest = $("[data-rest]", root);
    var label = $("[data-edit-label]", root);
    var labelText = $("span", label);
    var dot = $(".nlab-dot", label);
    var undo = $("[data-undo]", root);
    var NEW = typed.textContent;
    var STEPS = ["is-pre", "is-washed", "is-struck", "is-typing-in", "is-labelled", "is-told", "is-undone"];

    function setWords(n) {
      typed.textContent = NEW.slice(0, n);
      rest.textContent = NEW.slice(n);
    }

    var scene = createScene(root, {
      start: function () {
        STEPS.forEach(function (c) { root.classList.remove(c); });
        root.classList.add("is-pre");
        labelText.textContent = "Pip's edit";
        dot.hidden = false;
        setWords(0);
      },
      play: function (sleep) {
        var i = 0;
        function type() {
          if (i >= NEW.length) return Promise.resolve();
          i += 1;
          setWords(i);
          var ch = NEW.charAt(i - 1);
          var pause = ch === " " ? 40 : ch === "." ? 120 : 24 + Math.random() * 10;
          return sleep(pause).then(type);
        }
        return sleep(160)
          .then(function () { root.classList.add("is-washed"); return sleep(640); })
          .then(function () { root.classList.add("is-struck"); return sleep(520); })
          .then(function () { root.classList.add("is-typing-in"); return type(); })
          .then(function () { return sleep(260); })
          .then(function () { root.classList.remove("is-typing-in"); root.classList.add("is-labelled"); return sleep(320); })
          .then(function () { root.classList.add("is-told"); return sleep(400); });
      },
      end: function () {
        STEPS.forEach(function (c) { root.classList.remove(c); });
        labelText.textContent = "Pip's edit";
        dot.hidden = false;
        setWords(NEW.length);
      }
    });

    // Undo really undoes: the paragraph goes back to your words
    undo.addEventListener("click", function () {
      scene.cancel();
      STEPS.forEach(function (c) { root.classList.remove(c); });
      root.classList.add("is-pre", "is-undone", "is-labelled");
      labelText.textContent = "your words";
      dot.hidden = true;
      setWords(0);
      scene.showReplay();
      if (scene.replay) scene.replay.focus();
    });
  }

  /* Already briefed: two questions, answered like a chat. The question, then
     Pip's activity line with three dots for 700ms, then the answer. */
  function sceneBriefed() {
    var root = $('[data-scene="briefed"]');
    if (!root) return;
    var steps = $$("[data-step]", root);

    function clear() {
      steps.forEach(function (s) { s.classList.remove("is-shown", "is-thinking", "is-answered"); });
    }

    createScene(root, {
      start: function () { clear(); root.classList.add("is-pre"); },
      play: function (sleep) {
        function pair(i) {
          if (i >= steps.length) return Promise.resolve();
          var q = steps[i];
          var a = steps[i + 1];
          q.classList.add("is-shown");
          return sleep(700)
            .then(function () { a.classList.add("is-shown", "is-thinking"); return sleep(700); })
            .then(function () {
              a.classList.remove("is-thinking");
              a.classList.add("is-answered");
              return i + 2 < steps.length ? sleep(1200).then(function () { return pair(i + 2); }) : sleep(300);
            });
        }
        return sleep(200).then(function () { return pair(0); });
      },
      end: function () { clear(); root.classList.remove("is-pre"); }
    });
  }

  /* Switch AI: the model menu opens from its chip, and the choice moves from
     Claude Sonnet to Claude Opus to GLM Flash and back. The chat behind it
     does not move at all. */
  function sceneSwitch() {
    var root = $('[data-scene="switch"]');
    if (!root) return;
    var label = $("[data-chip-label]", root);
    var opts = $$(".mm-opt", root);
    var sel = $("[data-sel]", root);
    var ORDER = [1, 3, 0]; // Claude Opus, GLM Flash, back to Claude Sonnet

    function choose(i, animate) {
      opts.forEach(function (o, k) { o.classList.toggle("is-on", k === i); });
      $(".mm-name", opts[i]).insertBefore(sel, $(".mm-name", opts[i]).firstChild);
      var name = opts[i].getAttribute("data-model");
      if (animate) swapText(label, name); else label.textContent = name;
    }

    createScene(root, {
      start: function () {
        root.classList.add("is-pre");
        root.classList.remove("is-open");
        choose(0, false);
      },
      play: function (sleep) {
        var n = 0;
        function next() {
          if (n >= ORDER.length) return Promise.resolve();
          choose(ORDER[n], true);
          n += 1;
          return sleep(1400).then(next);
        }
        return sleep(300)
          .then(function () { root.classList.add("is-open"); return sleep(1400); })
          .then(next);
      },
      end: function () {
        root.classList.remove("is-pre", "is-open");
        choose(0, false);
      }
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
    sceneFind();
    sceneYours();
    sceneBriefed();
    sceneSwitch();
  }


  /* ── demo ──────────────────────────────────────────────────────────────────
     "Have a play": a product listing note with its photo, Pip beside it. Pick
     a paragraph, take a suggestion or type; Pip edits the note in place and
     says "Changed · Show · Undo", as the app does. The replies are set.
     Everything lives inside #play, so a live embed can replace it later. */

  function demo() {
    var root = $("#demo");
    if (!root) return;

    var NOTE = "Mustard scallop shade";
    var PARAS = [
      {
        pre: "New scallop shade going in the shop tonight. This one's in a mustard linen I've been saving for months. ",
        old: "It took me two goes to get the scallops even, honestly I think it was probably worth it in the end but my fingers might not agree.",
        neu: "Two goes to get the scallops even. Worth it, though my fingers disagree.",
        post: " Only one, as always."
      },
      {
        pre: "Handmade in my studio in Hove, with a cotton lining that gives a warm glow. ",
        old: "It works really well as a ceiling pendant but it also works on a lamp base too, depending on what you prefer, either is fine.",
        neu: "Hang it from the ceiling or sit it on a lamp base.",
        post: " Free UK delivery, in recyclable packaging."
      }
    ];
    var HEAD = ["Size", "Width", "Box (cm)", "Send by"];
    var ROWS = [
      { line: "Small: 30cm wide, box 35 x 35 x 30", cells: ["Small", "30cm", "35×35×30", "Medium parcel"] },
      { line: "Medium: 40cm wide, box 45 x 45 x 40", cells: ["Medium", "40cm", "45×45×40", "Medium parcel"] },
      { line: "Large: 50cm wide, box 55 x 55 x 50", cells: ["Large", "50cm", "55×55×50", "Courier"] }
    ];
    var HELLO = { who: "pip", text: "You've got a caption and a list of sizes open. Want me to tighten the caption, or put the sizes in a table? Or ask me something else." };

    var paras = $$(".para", root);
    var log = $("#demo-log");
    var sugs = $$(".sug", $("#demo-sugs"));
    var sizes = $("#demo-sizes");
    var selchip = $("#demo-selchip");
    var selText = $(".selchip-text", selchip);
    var headFace = $("#demo-face");
    var form = $("#demo-form");
    var input = $("#demo-input");
    var files = $(".demo-files", root);
    var filesToggle = $(".files-toggle", root);

    var st, timer, nodes, waitNode;

    function fresh() { return { sel: null, p: [0, 0], table: false, msgs: [], thinking: false, open: {}, undone: {} }; }

    function paraText(i) { var d = PARAS[i]; return d.pre + (st.p[i] ? d.neu : d.old) + d.post; }
    function words(i) { return paraText(i).trim().split(/\s+/).length; }

    /* The note */
    function renderParas() {
      paras.forEach(function (p, i) {
        if (p.textContent !== paraText(i)) p.textContent = paraText(i);
        p.setAttribute("aria-pressed", st.sel === i ? "true" : "false");
      });
    }
    function renderSizes() {
      sizes.textContent = "";
      if (st.table) {
        var wrap = el("div", "tbl-wrap");
        var table = el("table", "tbl");
        table.setAttribute("aria-label", "Sizes");
        var thead = el("thead"), hr = el("tr");
        HEAD.forEach(function (h) { var th = el("th", "", h); th.setAttribute("scope", "col"); hr.appendChild(th); });
        thead.appendChild(hr);
        var tbody = el("tbody");
        ROWS.forEach(function (r) {
          var tr = el("tr");
          r.cells.forEach(function (c) { tr.appendChild(el("td", "", c)); });
          tbody.appendChild(tr);
        });
        table.appendChild(thead);
        table.appendChild(tbody);
        wrap.appendChild(table);
        sizes.appendChild(wrap);
      } else {
        var ul = el("ul", "doc-list");
        ROWS.forEach(function (r) { ul.appendChild(el("li", "", r.line)); });
        sizes.appendChild(ul);
      }
    }

    /* Pip's side */
    function renderSugs() {
      sugs[0].textContent = st.sel === null ? "Tighten the caption" : "Tighten this";
      selchip.hidden = st.sel === null;
      if (st.sel !== null) selText.textContent = words(st.sel) + " words selected in “" + NOTE + "”";
    }

    function buildMsg(m, k) {
      if (m.who === "user") return el("div", "msg msg--user", m.text);
      var row = el("div", "msg msg--pip");
      row.appendChild(face(22));
      var col = el("div", "msg-col");
      if (m.act) {
        var act = el("p", "act");
        act.appendChild(icon("search", 12));
        act.appendChild(el("span", "", m.act));
        col.appendChild(act);
      }
      var p = el("p");
      (m.parts || [m.text]).forEach(function (part) {
        if (typeof part === "string") { p.appendChild(document.createTextNode(part)); return; }
        var src = el("span", "src");
        src.appendChild(icon("table", 12));
        src.appendChild(document.createTextNode(part.src));
        p.appendChild(src);
      });
      col.appendChild(p);

      if (m.change) {
        var line = el("div", "changed");
        if (st.undone[k]) {
          line.appendChild(el("span", "", "Undone"));
        } else {
          line.appendChild(el("span", "", "Changed “" + NOTE + "”"));
          var show = el("button", "text-btn", st.open[k] ? "Hide" : "Show");
          show.type = "button";
          show.setAttribute("aria-expanded", st.open[k] ? "true" : "false");
          show.addEventListener("click", function () { st.open[k] = !st.open[k]; refresh(k, "show"); });
          var undo = el("button", "text-btn", "Undo");
          undo.type = "button";
          undo.addEventListener("click", function () {
            if (m.change.kind === "para") st.p[m.change.i] = 0; else st.table = false;
            st.undone[k] = true;
            st.open[k] = false;
            renderParas();
            renderSizes();
            renderSugs();
            refresh(k);
          });
          line.appendChild(show);
          line.appendChild(undo);
        }
        col.appendChild(line);
        if (st.open[k] && !st.undone[k]) {
          var diff = el("div", "diff");
          if (m.change.kind === "para") {
            var d = PARAS[m.change.i];
            diff.appendChild(el("del", "", d.old));
            diff.appendChild(el("ins", "", d.neu));
          } else {
            var del = el("del");
            ROWS.forEach(function (r, n) { if (n) del.appendChild(el("br")); del.appendChild(document.createTextNode(r.line)); });
            diff.appendChild(del);
            diff.appendChild(el("ins", "", "A table: Size, Width, Box, Send by"));
          }
          col.appendChild(diff);
        }
      }
      row.appendChild(col);
      return row;
    }

    function scrollLog() {
      var top = log.scrollHeight;
      if (log.scrollTo) log.scrollTo({ top: top, behavior: reduced() ? "auto" : "smooth" });
      else log.scrollTop = top;
    }

    function addMsg(m, animate) {
      st.msgs.push(m);
      var k = st.msgs.length - 1;
      var node = buildMsg(m, k);
      if (animate) node.classList.add("is-new");
      nodes[k] = node;
      log.appendChild(node);
      scrollLog();
    }

    function refresh(k, focusWhat) {
      var next = buildMsg(st.msgs[k], k);
      log.replaceChild(next, nodes[k]);
      nodes[k] = next;
      if (focusWhat === "show") {
        var b = $(".changed .text-btn", next);
        if (b) b.focus();
      } else {
        next.setAttribute("tabindex", "-1");
        next.focus({ preventScroll: true });
      }
    }

    function setWaiting(on) {
      st.thinking = on;
      setThinking(headFace, on);
      if (on) {
        waitNode = el("div", "msg msg--pip msg--wait is-new");
        waitNode.appendChild(face(22, true));
        waitNode.appendChild(dots());
        waitNode.appendChild(el("span", "sr-only", "Pip is working…"));
        log.appendChild(waitNode);
        scrollLog();
      } else if (waitNode) {
        waitNode.remove();
        waitNode = null;
      }
    }

    /* Ask Pip: the user's line now, his reply after a beat */
    function say(userText, reply) {
      if (st.thinking) return;
      addMsg({ who: "user", text: userText }, true);
      setWaiting(true);
      timer = setTimeout(function () {
        setWaiting(false);
        var m = reply();
        m.who = "pip";
        addMsg(m, true);
        if (m.change) {
          if (m.change.kind === "para") { renderParas(); if (st.sel !== m.change.i) wash(paras[m.change.i]); }
          else { renderSizes(); wash(sizes); }
          renderSugs();
        }
      }, reduced() ? 0 : 1000);
    }

    function tighten() {
      var i = st.sel === null ? 0 : st.sel;
      say("Tighten this up, but keep it in my words.", function () {
        if (st.p[i]) return { text: "That one's already tightened." };
        st.p[i] = 1;
        return {
          text: i === 0 ? "Cut the hedging and kept how you talk. “Only one, as always.” stays yours." : "Trimmed the repetition. The rest already sounded like you.",
          change: { kind: "para", i: i }
        };
      });
    }
    function makeTable() {
      say("Turn the sizes into a table.", function () {
        if (st.table) return { text: "It's already a table." };
        st.table = true;
        return { text: "Done. The large one needs a courier, so check the postage before you price it.", change: { kind: "table" } };
      });
    }
    function lastSold() {
      say("What did the last scallop sell for?", function () {
        return { act: "Looked in your tables", parts: ["Your ", { src: "Shades sold" }, " table says £250, for the medium in sage linen in August. It sold in two days."] };
      });
    }

    function reset() {
      clearTimeout(timer);
      st = fresh();
      nodes = [];
      waitNode = null;
      setThinking(headFace, false);
      log.textContent = "";
      addMsg(HELLO, false);
      renderParas();
      renderSizes();
      renderSugs();
    }

    paras.forEach(function (p, i) {
      function pick() { st.sel = st.sel === i ? null : i; renderParas(); renderSugs(); }
      p.addEventListener("click", pick);
      p.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
      });
    });
    sugs[0].addEventListener("click", tighten);
    sugs[1].addEventListener("click", makeTable);
    sugs[2].addEventListener("click", lastSold);
    $("#demo-clearsel").addEventListener("click", function () {
      var was = st.sel;
      st.sel = null;
      renderParas();
      renderSugs();
      if (was !== null) paras[was].focus();
    });
    $("#demo-reset").addEventListener("click", reset);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      input.value = "";
      say(text, function () {
        return { text: "This demo runs on scripted replies, so try one of the suggestions. In the app, you can ask me anything." };
      });
    });

    if (filesToggle) {
      filesToggle.addEventListener("click", function () {
        var open = filesToggle.getAttribute("aria-expanded") !== "true";
        filesToggle.setAttribute("aria-expanded", open ? "true" : "false");
        files.classList.toggle("is-open", open);
      });
    }

    reset();
  }



  /* ── live demo ─────────────────────────────────────────────────────────────
     On a laptop, load the real Pip web demo in a frame behind the scripted
     window, and swap only when the demo posts pip-demo:ready from its own
     origin. A frame the host refuses (or a slow network) never swaps, so the
     scripted window is always the floor. Phones and Save-Data keep the stand-in. */
  function liveDemo() {
    var play = $("#play");
    if (!play) return;
    var src = play.getAttribute("data-live-demo");
    if (!src || !window.matchMedia) return;
    if (navigator.connection && navigator.connection.saveData) return;
    var wide = window.matchMedia("(min-width: 1024px)");
    var origin;
    try { origin = new URL(src, location.href).origin; } catch (e) { return; }

    function start() {
      // The app exactly as it is: no bar, title or chrome of the site's own
      // around it. The frame only rounds its corners and casts the shadow.
      var win = el("div", "win win--live");
      win.setAttribute("aria-hidden", "true");
      var frame = document.createElement("iframe");
      frame.src = src;
      frame.title = "Pip, with a sample workspace you can play with";
      frame.setAttribute("referrerpolicy", "no-referrer");
      frame.tabIndex = -1;
      win.appendChild(frame);
      play.appendChild(win);
      var note = el("p", "live-note", "A sample workspace to play with. The replies are set, and nothing you do is saved.");
      note.hidden = true;
      play.appendChild(note);
      window.addEventListener("message", function onReady(e) {
        if (e.origin !== origin || !e.data || e.data.type !== "pip-demo:ready") return;
        window.removeEventListener("message", onReady);
        win.removeAttribute("aria-hidden");
        frame.tabIndex = 0;
        note.hidden = false;
        play.classList.add("is-live");
      });
    }
    var started = false;
    function go() {
      if (started || !wide.matches) return;
      started = true;
      (window.requestIdleCallback || function (f) { return setTimeout(f, 600); })(start);
    }
    // A window that grows to laptop width later (a resized window, a pane that
    // opens narrow) still gets the real demo.
    if (wide.addEventListener) wide.addEventListener("change", go); else if (wide.addListener) wide.addListener(go);
    if (document.readyState === "complete") go(); else window.addEventListener("load", go, { once: true });
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
      { title: "Lume Lighting › mustard-scallop.jpg", intro: "There's a mug and some scissors behind the shade. Want me to take the background out, brighten it and make it square for the shop?", go: "Yes, clean it up", done: "Background out, a little brighter, and square for the listing. Your original is still there if you want it back." },
      { title: "Lume Lighting › Costs: large scallop", intro: "I can add up what a large scallop costs you to make. I'll need one number from you first.", go: "Yes, add it up",
        ask: {
          q: "What's an hour of your time worth?",
          opts: ["£15", "£20", "£25"],
          apply: function (i) {
            var rate = RATES[i];
            addRow(["Your time, 3 hours at £" + rate, "£" + (3 * rate) + ".00", ""]);
            later(function () { addRow(["To make and send", "£" + (50 + 3 * rate) + ".00", "is-total"]); }, 380);
          },
          after: function (i) { return "£" + (50 + 3 * RATES[i]) + " to make and send. Your large shades sell for £280 to £320. Where you land in that range is your call."; }
        } },
      { title: "Lume Lighting › Drum workshop steps", intro: "You've got the steps for Saturday. Want them as a deck?", go: "Yes, make the deck", done: "Six slides, one for each step. Drop your photos in and move anything you like." },
      { title: "Lume Lighting › Spring collection · Canvas", intro: "Your ideas for spring are all over the place. Want me to group them?", go: "Yes, group them",
        ask: {
          q: "Which fabric leads the spring collection?",
          opts: ["Green leaf linen", "Dotted cotton", "Striped linen"],
          apply: function (i) {
            $$(".cvi--sw", win).forEach(function (s) { s.classList.toggle("is-chosen", +s.getAttribute("data-fabric") === i); });
          },
          after: function (i) { return this.opts[i] + " leads, then. One gap to fill: the 50cm scallop has no price yet."; }
        } },
      { title: "Lume Lighting › Sales " + D.salesYear, intro: "This is your sales sheet, month by month. Want a chart of it, and a dashboard you can keep?", go: "Yes, show me", done: "Here's one you might have missed: workshops made 43% of sales this year, up from 22% last year." }
    ];
    var NL = [
      "Hello, and thank you for such a lovely summer at the studio.",
      "The mustard scallop is finally in the shop. It's the linen I've been saving for months, and as always there's only one.",
      "Two places left on the drum workshop on " + D.long(D.drum) + ". And the lino printing day is open for " + D.long(D.lino) + ": eight places, £110, and you take your printed shade home.",
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

  [dates, header, mascots, reveal, scenes, demo, liveDemo, jobs, accordion, jumpList, download].forEach(function (init) {
    try { init(); } catch (err) {
      if (window.console && console.error) console.error("pip site:", err);
    }
  });
  window.PIP_READY = true;
})();
