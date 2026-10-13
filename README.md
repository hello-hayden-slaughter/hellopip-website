# Pip · Website

Static marketing site for hellopip.co.uk. No build step: GitHub Pages serves the repo root.

## Files
- `index.html`, `pricing.html`, `privacy.html`, `questions.html`, `download.html`: the five pages (flat, so relative links work everywhere)
- `css/site.css`: one stylesheet, in order: fonts, the design system's tokens, website extensions, base, layout, components, vignettes, home, pages, motion
- `js/site.js`: vanilla, deferred, one module per behaviour (header, mascots, reveal, scenes, demo, jobs, accordion, jumpList, download)
- `assets/fonts/`: Nunito (variable, latin) and its OFL licence, self-hosted
- `assets/pip/`: the canonical mascot SVGs from the design kit
- `assets/img/`: real photos go here
- `assets/favicon*`, `assets/apple-touch-icon.png`, `assets/og-card.png`, `site.webmanifest`, `CNAME`

## Photo slots
Every photo is a placeholder `<div class="ph" data-photo="…">` with its shot and ratio in its label. To swap one, replace that element with an `<img>` of the same ratio (keep `class="ph"` for the radius) and write its alt text.

## Review markers
Square-bracket notes in the copy (`[N]`, `[contact address]`, `[Check with Jo before this goes live]`) are `<span class="rm">`. Delete the span when the note is settled. On the download page, `[version]`, `[size]` and `[date]` are filled from the latest GitHub release when it answers.

## The playable demo
"Have a play" on the home page is the site's own scripted sample, inside `#play`. A live embed of the Pip web demo can replace the contents of `#play` later.

## Downloads
Every "Download for Mac" button goes to `download.html?start=1`. That page finds the Mac's chip and the latest release of `hello-hayden-slaughter/Pip-release`, links its big button to the matching disk image (the releases page if GitHub doesn't answer) and, on a Mac, starts the download.

## Local preview
Run `npx serve .` (or any static server) from this folder and open the address it prints.
