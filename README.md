# curveforge-ui

Browser playground for [curveforge](https://pypi.org/project/curveforge/),
the Python library that builds Dirac Live target curves. The Python core
runs in the page via Pyodide — the UI calls the exact same `build_curve()`
function the CLI uses, so the math is the canonical reference.

**Live:** https://teolbb.github.io/curveforge-ui/

## What it does

- **Eight base curves** (Harman, Olive–Welti, Brüel & Kjær, Toole, sub
  shelves, flat, fully-custom breakpoints) with schema-driven param
  sliders rendered from the Python library's metadata.
- **Composable transforms** — peaking EQ, shelves, tilt, gain, roll-off
  — stacked on top of any base curve. Reorder, remove, tweak live.
- **A/B compare** two recipes side-by-side; <kbd>A</kbd>/<kbd>B</kbd>
  to switch, <kbd>S</kbd> to swap.
- **Live audio preview** through a 31-band parametric-EQ cascade. Drive
  it with pink noise, a log sweep, or an uploaded file. <kbd>Space</kbd>
  bypasses for instant before/after.
- **YAML import/export** in the same format the CLI consumes — design
  here, ship the recipe straight to a pipeline.
- **`.targetcurve` export** ready for Dirac Live's calibration tool.
- All state persists in `localStorage`; no backend, no accounts.

## Develop

```sh
npm install
npm run dev      # http://localhost:5173/
npm run lint:all # eslint + stylelint + tsc --noEmit
npm run build    # static output to dist/
```

First load downloads Pyodide (~10 MB) and installs `curveforge` from
PyPI via `micropip` — takes a few seconds, then cached.

## Layout

```
src/
  main.ts          entry — listeners + bootstrap
  engine/          domain logic, no Preact
    state.ts       signals + persistence + mutations
    audio.ts       Web Audio EQ cascade
    bridge.ts      Pyodide + YAML I/O
  ui/              view layer
    App.ts         Preact components, grouped by panel
    plot.ts        SVG magnitude-response renderer
    actions.ts     UI → side-effect handlers
    widgets.ts     reusable widgets
    {icons,labels,sparklines,types}.ts
  styles/          themed CSS files
public/schemas.json  curve + transform metadata, regenerated from curveforge
```

The Pyodide bridge is intentionally thin: each curve build writes a
small JSON payload into Python globals, runs `build_curve()`, reads
back `{freqs, gains_db}`. Plot rendering is plain SVG — no charting
library.

## License

MIT.
