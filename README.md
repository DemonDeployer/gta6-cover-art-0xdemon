# Neon Vice Cover Studio

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/DemonDeployer/gta6-cover-art-0xdemon/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/DemonDeployer/gta6-cover-art-0xdemon/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Neon Vice Cover Studio is an offline web app that turns your own photos and a caption into a GTA 6-style multi-panel cover poster — bold display lettering, a Vice City sunset or neon colour grade, and a one-click PNG export in the sizes people actually post.

Open it, drop in one or several photos, pick one of three panel layouts and one of four sunset/neon grades, drag and zoom each photo inside its panel, type your caption, and export a 1080x1080, 1080x1350 or 1920x1080 PNG. Everything runs locally in your browser: photos are read on your machine and never uploaded, and the app makes no network request at all.

## Run

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no install.

## How it works

- **Photos:** upload your own images (or try the two built-in sample scenes). Each panel keeps its own photo, zoom and position — drag on the preview to move a photo, use the zoom slider to crop it, or fill every panel with one photo.
- **Layouts:** Vice Trio (3 tall panels), Neon Grid (4-panel grid), Hero + Strip (one big hero panel with a two-panel strip beside it).
- **Grades:** Sunset, Neon Pink, Vice Purple and Golden Hour — gradient-map colour grades plus grain and a vignette for the poster look.
- **Caption:** editable title in Anton with a Bebas Neue subtitle, drawn as bold display lettering with an outline and drop shadow.
- **Export:** renders the cover off-screen at full size and downloads it as a PNG.

## Fonts

Anton and Bebas Neue are licensed under the SIL Open Font License (OFL) — see `app/fonts/`.

## Entry

Built for the [gta6-cover-art-01 bounty on make.fun](https://make.fun/bounty/gta6-cover-art-01). Referral code: `qamf9tkx`.

## License

MIT — see [LICENSE](LICENSE).
