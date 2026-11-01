# Foldlight Studio

A browser tool for designing folded, textured and pierced lampshades and exporting them for 3D printing.
Live at **https://lamp.huescript.com** (main site, Cloudflare) and **https://rahuls190.github.io/Fold/** (GitHub Pages copy of this repo).

## What it does
- **Shape**: draw the shade profile, stack several sections, match rims between sections.
- **Pattern**: folds (reverse fold, pleats, flutes, origami studies), relief textures (honeycomb, Voronoi, fish scale, ripples, knurl, basket weave…), cut-out holes, and lithophanes from your own image.
- **Fitting**: preview a real bulb and lampholder (E27 / E14 / B22) or IKEA pendant cords, table and floor bases, with bulb-to-wall clearance checks.
- **Export**: print check (watertight, self-intersections, wall thickness, printer volume), optional mesh smoothing (Loop subdivision with sharp-crease preservation), and STL / 3MF / OBJ / project file downloads.

## Project layout
| Path | What it is |
| --- | --- |
| `src/` | Source: `index.html`, `style.css`, and the scripts (`engine.js` geometry, `checks.js` print checks, `app.js` editor, `ui.js` step flow, `fitting.js` bulbs and bases, `joints.js`, `vase-*.js`, `export-3mf.js`) |
| `dist/` | Built static site, the folder that is deployed |
| `index.html` | Forwards the GitHub Pages root to `dist/` |
| `build.py` | Copies `src/` + `three.min.js` into `dist/`, and writes `artifact.html` (single-file version) |
| `three.min.js` | three.js r160 |
| `CHANGES.md` | Detailed change log |

## Run locally
Plain HTML/JS, no install needed.
```
python3 build.py
cd dist && python3 -m http.server 8000
```
Then open http://localhost:8000.

## Deploy
The live site is a Cloudflare Worker serving the contents of `dist/` as static assets.
After changing `src/`, bump the `?v=` tags in `src/index.html`, run `python3 build.py`, and upload `dist/` (or a zip of it) as a new deployment.
