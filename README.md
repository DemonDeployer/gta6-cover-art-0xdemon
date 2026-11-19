# gta6-cover-art-0xdemon

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/DemonDeployer/gta6-cover-art-0xdemon/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/DemonDeployer/gta6-cover-art-0xdemon/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Neon Vice Cover Studio** — turn your photo and a caption into multi-panel poster cover art in the style of GTA 6's posters: bold lettering, a Vice City sunset and neon grade, palm silhouettes and a retro striped sun. It runs fully offline in a desktop browser from its own static files; your photos never leave your machine.

## What it does

- **Any photo:** load one photo for every panel, or a different photo per panel (Hero / Panel two / Panel three). Each panel crops independently — drag the preview to pan, or use the zoom and pan sliders. Empty panels fall back to a procedural sunset-city scene drawn in code.
- **Multi-panel layouts:** Sunset Split (hero + two panels below), Diagonal Vice (three slanted slices), Triple Strip (three vertical panels).
- **Sunset / neon grades:** Sunset, Neon Pink, Teal Night and Gold Hour, plus toggles for palm silhouettes, neon sun, halftone dots, vignette and neon frame.
- **Words:** caption + subtitle in original bold lettering (Anton + Bebas Neue, SIL OFL), three caption styles (Sunset fill, Neon glow, Solid white) and a size slider.
- **Fast export:** one click to PNG at **1080 × 1080**, **1080 × 1350** or **1920 × 1080** — square for the feed, portrait for stories, wide for banners.

## Run it

No build step, no network at runtime. Serve `app/` with any static server and open `app/index.html`:

```sh
node serve.ts
# app/ is on http://localhost:8080
```

Or open `app/index.html` directly from the file system. Try the samples first: **Fill all panels with samples**, then swap in your own photos.

## Screenshots

`shots.json` lists the four screenshots under `screenshots/` (cover first): the exported covers in all three post sizes, plus the editor with a photo loaded. Each shot is a fixed scene the app renders itself via `?shot=cover` / `?shot=editor` query parameters.

## Originality

Everything is original: the art, lettering, sample photos and code. No Rockstar Games logos, wordmarks, official artwork, characters or fonts. Fonts are Anton and Bebas Neue under the SIL Open Font License (see `app/fonts/OFL.txt`). The two sample photos under `app/samples/` are original illustrations drawn in code for this entry.

## Files

- `app/index.html`, `app/app.js`, `app/style.css` — the static web app
- `app/fonts/` — Anton + Bebas Neue (OFL)
- `app/samples/` — two original sample photos
- `main.ts` — the make.fun entrypoint: copies `app/` + `screenshots/` to `/output` and writes `dossier.json`
- `vendor/makefun-app.ts` — the kit's library, unchanged
- `screenshots/` — 4 screenshots (cover first), `shots.json` — how each was taken

## Bounty

Entered in the [make.fun bounty "Make GTA 6 Cover Art" (gta6-cover-art-01)](https://make.fun/bounty/gta6-cover-art-01) — $250 shared by the top 50 entries. The app is MIT licensed (see `LICENSE`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=qamf9tkx&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
