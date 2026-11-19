# Neon Vice Cover Studio

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/DemonDeployer/gta6-cover-art-0xdemon/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/DemonDeployer/gta6-cover-art-0xdemon/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn your photo into cover art in the style of GTA 6 posters — a sunset
city cover with a bold title, ready to share as a PNG. No Rockstar assets
and no real-person photos: the two built-in sample photos are original art
drawn for this app.

Competition: [gta6-cover-art-01 on make.fun](https://make.fun/bounty/gta6-cover-art-01)

## What it does

- Three cover layouts, exported at exact sizes: square 1080&times;1080,
  portrait 1080&times;1350, wide 1920&times;1080.
- Per-panel crop: each layout's photo sits in one or two panels, and every
  panel has its own zoom and crop position (sliders, or drag the preview).
- Four sunset/neon grades, each a distinct colour treatment plus a graphic
  overlay drawn in canvas: Sunset Split (warm sky, slatted sun), Neon
  Diagonal (magenta/cyan diagonal bands), Gold Strip (gold bands), and
  Purple Dusk (purple fade with palm silhouettes). Palm silhouettes are
  drawn in canvas in every grade.
- Editor: load a photo (two built-in original samples, or upload your own),
  pick a layout and a grade, adjust the crop, edit the title and subtitle,
  live preview, and export the composed cover as a PNG download.
- Self-test: open the app with `?selftest=1` and it renders all three
  export sizes on offscreen canvases and reports SELFTEST OK only when
  they are exactly 1080&times;1080, 1080&times;1350 and 1920&times;1080.

## Run it locally

```sh
node serve.ts
```

Then open http://localhost:8080 in a browser. Everything is static and
offline: fonts, sample photos and code all load from the app's own files.

## Screenshots

- `screenshots/1-cover.jpg` — exported square cover, Sunset Split grade.
- `screenshots/2-editor.jpg` — the editor with a sample photo loaded.
- `screenshots/3-cover-portrait.jpg` — exported portrait cover, Neon Diagonal grade.
- `screenshots/4-cover-wide.jpg` — exported wide cover, Gold Strip grade.

## License

MIT — see [LICENSE](LICENSE). The Anton and Bebas Neue fonts in
`app/fonts/` are licensed under the SIL Open Font License 1.1 (see
`app/fonts/OFL.txt`).
