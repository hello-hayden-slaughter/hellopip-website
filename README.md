# Pip — Website

Static marketing site. No build step.

## Files
- `index.html` — the site
- `direction-a.js` — mascot + interactions
- `site.webmanifest` — PWA manifest
- `assets/favicon*` — favicons (SVG + PNG, plus Apple touch icon)

## Deploy

**Drag-and-drop (fastest):**
1. Go to https://app.netlify.com/drop
2. Drag this whole folder onto the page
3. You'll get a live URL in ~30 seconds

**Or via GitHub + Cloudflare Pages / Vercel / Netlify:**
1. `git init && git add . && git commit -m "initial"`
2. Push to a new GitHub repo
3. Connect that repo in your host of choice — no build command, output dir is the repo root

## Custom domain
Point your domain at the host (each host walks you through the DNS record). HTTPS is automatic on all the modern hosts.

## Local preview
Open `index.html` in a browser, or run:
```
npx serve .
```
