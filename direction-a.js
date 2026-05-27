// direction-a.js — interactions for Pip site (Quiet Character direction)

(() => {
  // ─── Inject mascots ─────────────────────────────────────────────
  const tmpl = document.getElementById('mascot-template');
  document.querySelectorAll('[id$="-mascot"]').forEach(slot => {
    slot.appendChild(tmpl.content.cloneNode(true));
  });
  // Notes annotation avatars get a smaller mascot
  document.querySelectorAll('.notes-anno-avatar').forEach(slot => {
    slot.appendChild(tmpl.content.cloneNode(true));
  });

  // ─── Mascot expressions ─────────────────────────────────────────
  // Each instance can have its own expression / eye-target.
  function setExpression(svg, state) {
    const mouth = svg.querySelector('.pip-mouth');
    const eyeL = svg.querySelector('.pip-eye-left');
    const eyeR = svg.querySelector('.pip-eye-right');
    const pupilL = svg.querySelector('.pip-pupil-left');
    const pupilR = svg.querySelector('.pip-pupil-right');
    if (!mouth) return;
    if (state === 'thinking') {
      mouth.setAttribute('d', 'M490 590 L530 590');
      pupilL.setAttribute('transform', 'translate(8, 8)');
      pupilR.setAttribute('transform', 'translate(32, 8)');
    } else if (state === 'happy') {
      mouth.setAttribute('d', 'M484 575 Q510 612 536 575');
      pupilL.setAttribute('transform', 'translate(10, 32)');
      pupilR.setAttribute('transform', 'translate(36, 32)');
    } else if (state === 'working') {
      mouth.setAttribute('d', 'M490 585 Q510 600 530 585');
      pupilL.setAttribute('transform', 'translate(28, 28)');
      pupilR.setAttribute('transform', 'translate(54, 28)');
    } else {
      // idle
      mouth.setAttribute('d', 'M490 580 Q510 600 530 580');
      pupilL.setAttribute('transform', 'translate(10, 32)');
      pupilR.setAttribute('transform', 'translate(36, 32)');
    }
  }

  const heroSvg = document.querySelector('#hero-mascot .pip-mascot');
  const navSvg  = document.querySelector('#nav-mascot .pip-mascot');
  const ctaSvg  = document.querySelector('#cta-mascot .pip-mascot');
  const footerSvg = document.querySelector('#footer-mascot .pip-mascot');

  // ─── Eye tracking on hero ──────────────────────────────────────
  function attachEyeTracking(svg, range = 60) {
    if (!svg) return;
    const pupilL = svg.querySelector('.pip-pupil-left');
    const pupilR = svg.querySelector('.pip-pupil-right');
    if (!pupilL || !pupilR) return;
    let rect = svg.getBoundingClientRect();
    const updateRect = () => { rect = svg.getBoundingClientRect(); };
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, { passive: true });
    document.addEventListener('mousemove', (e) => {
      // pivot around center of svg
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const max = 600; // saturate at 600px
      const f = Math.min(1, dist / max);
      const nx = (dx / (dist || 1)) * range * f;
      const ny = (dy / (dist || 1)) * range * f;
      pupilL.setAttribute('transform', `translate(${10 + nx}, ${32 + ny})`);
      pupilR.setAttribute('transform', `translate(${36 + nx}, ${32 + ny})`);
    });
  }
  attachEyeTracking(heroSvg, 70);
  attachEyeTracking(ctaSvg, 50);

  // ─── Blink ────────────────────────────────────────────────────
  function autoBlink(svg, minMs = 3500, maxMs = 7000) {
    if (!svg) return;
    const wrap = svg.closest('[id]') || svg.parentNode;
    const scheduleNext = () => {
      const delay = minMs + Math.random() * (maxMs - minMs);
      setTimeout(() => {
        wrap.classList.add('blink');
        setTimeout(() => wrap.classList.remove('blink'), 140);
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  }
  autoBlink(heroSvg);
  autoBlink(ctaSvg);

  // ─── Nav scroll style ─────────────────────────────────────────
  const nav = document.getElementById('nav');
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 8);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ─── Mock chat in the thinking section ────────────────────────
  const chatFrame = document.getElementById('chat-frame');
  const mascotMiniHTML = `<svg class="pip-mascot" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="#FF6B4A" d="M490.829 183.72C574.143 179.943 691.914 193.472 755.609 252.712C816.228 309.091 834.641 412.785 837.227 492.372C840.06 579.575 826.531 690.324 767.668 759.495C712.118 823.719 615.411 835.955 535.504 839.929C453.479 843.655 334.098 831.835 270.921 774.035C260.482 764.485 250.562 753.362 242.56 741.694C204.804 686.645 191.021 607.668 188.058 542.273C184.029 453.348 196.045 331.642 259.05 262.88C316.3 200.397 410.599 187.29 490.829 183.72Z"/><path fill="white" d="M390.446 334.902C452.032 329.947 505.934 375.948 510.722 437.546C515.51 499.145 469.365 552.922 407.754 557.545C346.377 562.149 292.848 516.218 288.078 454.853C283.308 393.489 329.095 339.837 390.446 334.902Z"/><path fill="#090A49" transform="translate(10, 32)" d="M375.012 386.136C393.249 382.926 410.641 395.092 413.879 413.324C417.117 431.556 404.978 448.967 386.751 452.233C368.484 455.506 351.027 443.335 347.782 425.063C344.537 406.791 356.735 389.353 375.012 386.136Z"/><path fill="white" d="M617.132 335.202C678.45 330.201 732.211 375.857 737.21 437.175C742.208 498.493 696.551 552.253 635.232 557.249C573.917 562.245 520.161 516.591 515.163 455.276C510.164 393.961 555.817 340.203 617.132 335.202Z"/><path fill="#090A49" transform="translate(36, 32)" d="M598.815 386.662C617.308 385.942 632.907 400.301 633.718 418.791C634.528 437.28 620.246 452.95 601.76 453.851C583.146 454.758 567.344 440.354 566.528 421.736C565.712 403.118 580.193 387.387 598.815 386.662Z"/><path d="M490 580 Q510 600 530 580" fill="none" stroke="#D4502E" stroke-width="6" stroke-linecap="round"/></svg>`;

  // User avatar: same shape, warm violet body + deeper violet mouth
  const userMascotMiniHTML = mascotMiniHTML
    .replace('fill="#FF6B4A"', 'fill="#7C5BD2"')
    .replace('stroke="#D4502E"', 'stroke="#4F3AA0"');

  const chatScript = [
    { who: 'user', text: "I'm stuck on the pricing for the IPP pilot. Should we just match what Aurora quoted?" },
    { who: 'tool', text: 'Granola — pulled IPP discovery transcript' },
    { who: 'pip', text: "Before you anchor on Aurora's number — what did Jan actually push back on in last week's discovery? You spent 40 minutes on procurement, not price." },
    { who: 'user', text: "Fair. He said legal would be the blocker." },
    { who: 'pip', text: "So the deal moves on procurement friction, not the headline number. Matching Aurora solves the wrong problem. Want me to draft a reply that proposes a faster procurement path instead?" },
  ];

  function bubbleRow({ who, text }) {
    const row = document.createElement('div');
    row.className = 'chat-row ' + who;
    if (who === 'pip') {
      row.innerHTML = `<div class="chat-avatar">${mascotMiniHTML}</div><div class="chat-bubble pip"></div>`;
    } else if (who === 'user') {
      row.innerHTML = `<div class="chat-bubble user"></div><div class="chat-avatar user">${userMascotMiniHTML}</div>`;
    } else if (who === 'tool') {
      row.className = 'chat-tool';
      row.textContent = text;
      return row;
    }
    const b = row.querySelector('.chat-bubble');
    b.textContent = text;
    return row;
  }

  function typingRow() {
    const row = document.createElement('div');
    row.className = 'chat-row pip';
    row.innerHTML = `<div class="chat-avatar">${mascotMiniHTML}</div><div class="chat-bubble pip"><div class="typing"><span></span><span></span><span></span></div></div>`;
    return row;
  }

  async function runChat() {
    chatFrame.innerHTML = '';
    for (let i = 0; i < chatScript.length; i++) {
      const item = chatScript[i];
      // for pip messages, show typing first
      if (item.who === 'pip') {
        const t = typingRow();
        chatFrame.appendChild(t);
        await wait(900);
        t.remove();
      }
      chatFrame.appendChild(bubbleRow(item));
      // trim if too many
      while (chatFrame.children.length > 6) {
        chatFrame.firstElementChild.remove();
      }
      await wait(item.who === 'tool' ? 700 : 1300);
    }
    await wait(2400);
    runChat();
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Start chat when scrolled into view
  const chatObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && !chatFrame.dataset.started) {
        chatFrame.dataset.started = '1';
        runChat();
      }
    });
  }, { threshold: 0.25 });
  chatObserver.observe(chatFrame);

  // ─── FAQ accordion ────────────────────────────────────────────
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const open = item.classList.toggle('open');
      const a = item.querySelector('.faq-a');
      if (open) {
        a.style.maxHeight = a.scrollHeight + 'px';
      } else {
        a.style.maxHeight = '0';
      }
    });
  });
  // open default
  document.querySelectorAll('.faq-item.open .faq-a').forEach(a => {
    a.style.maxHeight = a.scrollHeight + 'px';
  });

  // ─── Scroll reveal: ops cards stagger ────────────────────────
  const opsCards = document.querySelectorAll('.ops-card');
  opsCards.forEach((c, i) => {
    c.style.opacity = '0';
    c.style.transform = 'translateY(20px)';
    c.style.transition = `opacity 540ms ${i*70}ms ease, transform 540ms ${i*70}ms cubic-bezier(.2,.7,.3,1)`;
  });
  const opsObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.2 });
  opsCards.forEach(c => opsObserver.observe(c));

  // ─── Model picker click cycle ────────────────────────────────
  document.querySelectorAll('.model-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.model-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  // ─── Notes section: stagger Pip annotations on scroll-in ─────
  const notesMock = document.querySelector('.notes-mock');
  if (notesMock) {
    const annotations = notesMock.querySelectorAll('.notes-annotation');
    annotations.forEach((a, i) => {
      a.style.transitionDelay = (200 + i * 700) + 'ms';
    });
    const notesObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !notesMock.classList.contains('played')) {
          notesMock.classList.add('played');
        }
      });
    }, { threshold: 0.3 });
    notesObs.observe(notesMock);

    // Blink the gutter-label mascot
    const gutterMascot = document.querySelector('#gutter-mascot .pip-mascot');
    if (gutterMascot) autoBlink(gutterMascot, 2200, 5000);
  }

  // ─── Download buttons: upgrade to the direct latest-release DMG ─
  // Markup href already points at the latest-release page, so it works
  // with no JS and is the silent fallback if this fetch fails — same
  // destination either way. On success we upgrade to a one-click DMG
  // matched to the visitor's Mac architecture.
  //
  // macOS arch detection is awkward because navigator.userAgent reports
  // "Intel Mac OS X" on every Mac (Apple kept it stable for compat). So
  // we try the modern UA-Client-Hints path first (Chrome/Edge), then
  // fall back to the WebGL renderer string (works on Safari/Firefox):
  // M-series GPUs report "Apple GPU"/"Apple M…"; Intel Macs report
  // "Intel …" (and AMD-Radeon Macs are always Intel hosts).
  async function detectMacArch() {
    try {
      if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        const ua = await navigator.userAgentData.getHighEntropyValues(['architecture']);
        if (ua.architecture === 'arm') return 'arm64';
        if (ua.architecture === 'x86') return 'x64';
      }
    } catch (_) { /* fall through */ }
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          const renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
          if (/\bApple\b/.test(renderer) && !/Intel/i.test(renderer)) return 'arm64';
          if (/\bIntel\b/i.test(renderer)) return 'x64';
          if (/\b(AMD|Radeon|ATI)\b/i.test(renderer)) return 'x64';
        }
      }
    } catch (_) { /* fall through */ }
    return null;
  }

  // x64 build is the unsuffixed DMG (Pip-X.Y.Z.dmg); arm64 has -arm64 in the name.
  function pickDmgForArch(assets, arch) {
    const arm = assets.find(a => /-arm64\.dmg$/i.test(a.name));
    const x64 = assets.find(a => /\.dmg$/i.test(a.name) && !/arm64|universal/i.test(a.name));
    if (arch === 'x64') return x64 || arm;
    return arm || x64;
  }

  const downloadLinks = document.querySelectorAll('a.js-download');
  if (downloadLinks.length) {
    Promise.all([
      detectMacArch(),
      fetch('https://api.github.com/repos/hello-hayden-slaughter/Pip-release/releases/latest', {
        headers: { Accept: 'application/vnd.github+json' }
      }).then(r => r.ok ? r.json() : Promise.reject(r.status))
    ])
      .then(([arch, release]) => {
        const assets = release.assets || [];
        const primary = pickDmgForArch(assets, arch);
        if (primary && primary.browser_download_url) {
          downloadLinks.forEach(a => { a.href = primary.browser_download_url; });
        }
      })
      .catch(() => { /* keep the latest-release-page fallback href */ });
  }

})();
