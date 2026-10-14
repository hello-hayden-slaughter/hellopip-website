# Pip · Website

Static marketing site for hellopip.co.uk. No build step: GitHub Pages serves the repo root.

## Files
- `index.html`, `pricing.html`, `privacy.html`, `questions.html`, `download.html`: the five pages (flat, so relative links work everywhere)
- `css/site.css`: one stylesheet, in order: fonts, the design system's tokens, website extensions, base, layout, components, vignettes, home, pages, motion
- `js/site.js`: vanilla, deferred, one module per behaviour (header, mascots, reveal, scenes, demo, jobs, accordion, jumpList, download)
- `assets/fonts/`: Nunito (variable, latin) and its OFL licence, self-hosted
- `assets/pip/`: the canonical mascot SVGs from the design kit
- `assets/img/`: the demo screenshot, and `lume/` for the Lume Lighting photos (JPEG, about twice their displayed size, under 200 KB each)
- `assets/favicon*`, `assets/apple-touch-icon.png`, `assets/og-card.png`, `site.webmanifest`, `CNAME`

## Photo slots
A slot is an element with `data-photo="…"`. Where there's a photo it is an `<img class="ph" width height alt loading="lazy" decoding="async">` from `assets/img/lume/` (the `ph` class keeps the slot's ratio and radius); where there isn't one yet (`hayden`) it is a placeholder `<div class="ph">` with its shot and ratio in its label. To swap a placeholder, replace that element with an `<img>` of the same ratio and write its alt text.

## Review markers
Square-bracket notes in the copy (`[N]`, `[contact address]`, `[Check with Jo before this goes live]`) are `<span class="rm">`. Delete the span when the note is settled. On the download page, `[version]`, `[size]` and `[date]` are filled from the latest GitHub release when it answers.

## The playable demo
"Have a play" on the home page is the site's own scripted sample, inside `#play`. A live embed of the Pip web demo can replace the contents of `#play` later.

## Downloads
Every "Download for Mac" button goes to `download.html?start=1`. That page finds the Mac's chip and the latest release of `hello-hayden-slaughter/Pip-release`, links its big button to the matching disk image (the releases page if GitHub doesn't answer) and, on a Mac, starts the download.

## Local preview
Run `npx serve .` (or any static server) from this folder and open the address it prints.
