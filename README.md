# Project Henry — Henry Muli Muthini

Project Henry is a static HTML, CSS and JavaScript website hosted on **Cloudflare Pages**.

## Main pages
- `index.html` — main interactive hub and Ask Henry AI interface.
- `portfolio.html` — portfolio, clickable work-history tabs and CV download.
- `radio.html` — radio hub.
- `media.html` — movies and series catalogue.
- `games.html` — browser games hub.
- `music/index.html` and `music.html` — music search/player experiences.
- `admin/index.html` — Watchtower analytics dashboard.

## Deployment
The production site is `https://henrymuli.pages.dev`. Cloudflare Pages deploys the static project from the GitHub `main` branch. Keep experimental changes on feature branches and merge them through pull requests.

Cloudflare Pages Functions live under `functions/`; they provide the Watchtower tracking/data endpoints and radio-stream proxy. The legacy `netlify/` directory and `netlify.toml` are retained for reference and are not used by the Cloudflare Pages deployment.

## Key files
- `Henry_Muli_2026_CV.pdf` — portfolio CV download target.
- `slogo.png`, `sphoto.png`, `desktopicon.ico` — site branding and imagery.
- `site.webmanifest`, `desktop.webmanifest`, `sw.js` — install and offline-cache support.
- `schema.sql` — Watchtower D1 schema.
- `functions/watchtower-track.js` and `functions/watchtower-data.js` — Watchtower event collection and protected analytics endpoint.
- `functions/api/radio-stream.js` — allow-listed radio stream proxy.

## Cloudflare configuration
Configure the Pages D1 binding as `WATCHTOWER_DB`. Set the `WATCHTOWER_PASSWORD` secret for the protected Watchtower endpoint. Apply `schema.sql` to the D1 database before using analytics.

## Contact and social links
The portfolio contains contact actions and social-link placeholders where a verified destination has not been supplied. Update those in the page/source only when the correct destination is known.
