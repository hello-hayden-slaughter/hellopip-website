// main.js — Pip site interactions
(() => {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DEMO_URL = "https://demo.hellopip.co.uk";

  // ─── Inject the animated mascot into showcase slots ───────────────
  const tmpl = document.getElementById("pip-animated");
  document.querySelectorAll(".hero-mascot-slot, .final-mascot-slot").forEach((slot) => {
    if (tmpl) slot.appendChild(tmpl.content.cloneNode(true));
  });

  // ─── Eye tracking (follows the cursor, saturates with distance) ───
  function attachEyeTracking(svg, range = 60) {
    if (!svg || reduce) return;
    const pl = svg.querySelector(".pip-pupil-left");
    const pr = svg.querySelector(".pip-pupil-right");
    if (!pl || !pr) return;
    let rect = svg.getBoundingClientRect();
    const refresh = () => { rect = svg.getBoundingClientRect(); };
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, { passive: true });
    document.addEventListener("mousemove", (e) => {
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const f = Math.min(1, dist / 600);
      const nx = (dx / dist) * range * f, ny = (dy / dist) * range * f;
      pl.setAttribute("transform", `translate(${10 + nx}, ${32 + ny})`);
      pr.setAttribute("transform", `translate(${36 + nx}, ${32 + ny})`);
    });
  }

  // ─── Blink ────────────────────────────────────────────────────────
  function autoBlink(svg, min = 3500, max = 7000) {
    if (!svg || reduce) return;
    const next = () => {
      setTimeout(() => {
        svg.classList.add("blink");
        setTimeout(() => svg.classList.remove("blink"), 140);
        next();
      }, min + Math.random() * (max - min));
    };
    next();
  }

  document.querySelectorAll(".pip-animate").forEach((svg, i) => {
    attachEyeTracking(svg, i === 0 ? 70 : 50);
    autoBlink(svg);
  });

  // ─── Nav shadow on scroll ─────────────────────────────────────────
  const nav = document.getElementById("nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // ─── Scroll reveal ────────────────────────────────────────────────
  const revealables = document.querySelectorAll(".rv");
  if (reduce) {
    revealables.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealables.forEach((el) => io.observe(el));
  }

  // ─── Playable demo: click to load the live app in an iframe ───────
  // Kept behind a click so the heavy app only loads on intent, and so
  // the page is fast for everyone who just wants to download.
  const launch = document.getElementById("demo-launch");
  const win = document.getElementById("try");
  if (launch && win) {
    launch.addEventListener("click", () => {
      const app = win.querySelector(".app");
      const over = document.getElementById("demo-over");
      if (over) over.remove();
      if (app) app.remove();

      const iframe = document.createElement("iframe");
      iframe.className = "demo-frame";
      iframe.title = "Pip — live demo";
      iframe.setAttribute("loading", "lazy");
      iframe.setAttribute("allow", "clipboard-write");
      iframe.src = DEMO_URL;
      win.appendChild(iframe);

      // If the demo host isn't reachable yet, show a graceful fallback.
      const fallback = () => {
        if (iframe.dataset.ok) return;
        iframe.remove();
        const f = document.createElement("div");
        f.className = "demo-fallback";
        f.innerHTML =
          '<h3>The demo isn’t up just yet</h3>' +
          '<p>It’s on its way. In the meantime you can download Pip and have the real thing.</p>' +
          '<a class="btn btn-primary js-download" href="https://github.com/hello-hayden-slaughter/Pip-release/releases/latest">Download for Mac</a>';
        win.appendChild(f);
        wireDownloads(f.querySelectorAll("a.js-download"));
      };
      iframe.addEventListener("load", () => { iframe.dataset.ok = "1"; });
      setTimeout(fallback, 6000);
    }, { once: true });
  }

  // ─── Download buttons: resolve the arch-matched latest DMG ────────
  // The href already points at the latest-release page, so it works with
  // no JS. On success we upgrade to a one-click DMG matched to the Mac.
  async function detectMacArch() {
    try {
      if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        const ua = await navigator.userAgentData.getHighEntropyValues(["architecture"]);
        if (ua.architecture === "arm") return "arm64";
        if (ua.architecture === "x86") return "x64";
      }
    } catch (_) {}
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl) {
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        if (ext) {
          const r = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "");
          if (/\bApple\b/.test(r) && !/Intel/i.test(r)) return "arm64";
          if (/\bIntel\b/i.test(r)) return "x64";
          if (/\b(AMD|Radeon|ATI)\b/i.test(r)) return "x64";
        }
      }
    } catch (_) {}
    return null;
  }
  function pickDmg(assets, arch) {
    const arm = assets.find((a) => /-arm64\.dmg$/i.test(a.name));
    const x64 = assets.find((a) => /\.dmg$/i.test(a.name) && !/arm64|universal/i.test(a.name));
    if (arch === "x64") return x64 || arm;
    return arm || x64;
  }
  function wireDownloads(links) {
    if (!links.length) return;
    Promise.all([
      detectMacArch(),
      fetch("https://api.github.com/repos/hello-hayden-slaughter/Pip-release/releases/latest", {
        headers: { Accept: "application/vnd.github+json" },
      }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    ])
      .then(([arch, release]) => {
        const primary = pickDmg(release.assets || [], arch);
        if (primary && primary.browser_download_url) {
          links.forEach((a) => { a.href = primary.browser_download_url; });
        }
      })
      .catch(() => {});
  }
  wireDownloads(document.querySelectorAll("a.js-download"));
})();
