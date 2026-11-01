# Foldlight Studio: Claude build

**Based on:** the Codex `shade-studio` at commit fcb6382 (17 Oct 2026, 15:37 Dubai time). That version includes:
- vessel designer
- 3MF export
- per-point crease flip
- assembly seating
- profile grid

The original `shade-studio` folder is unchanged.

## How to run
- Open `dist/index.html`, or host the `dist/` folder.
- After editing `src/`, run `python3 build.py`. It rebuilds:
  - `dist/`: the multi-file site.
  - `artifact.html`: the single-file live page used on claude.ai.

## Added on top of the Codex version

**Fit section 01 to the pocket (Mount tab → Assembly seating):**
- **Clearance setting.** A "Pocket clearance per side" field, 0–3 mm with a default of 0.4 mm, saved in the project as `base.clearance`.
- **Fit button.** "Fit section 01 to the pocket" scales only section 01's bottom profile diameter. It repeats until the widest point within the 3.41 mm seating depth equals Ø139 − 2 × clearance. It uses the same measurement as Codex's seating check, and it is one undoable step.
- **Example.** The Shade 02 reference measures Ø144.5 within the seating depth. Fitting changes that to Ø138.2 at 0.4 mm clearance, or Ø137.0 at 1 mm, and the seating check then passes.
- **Vessel and hypar sections** are not resized automatically. The panel says so.

**Petal slots on the base preview.**
- The 16 slots from r83 to r141 are drawn on the base in the viewer.
- The assembly OBJ base stays simplified, as Codex wrote it.

**Downloads inside the claude.ai live page.**
- STL, 3MF and OBJ go through the viewer's save prompt as .zip files, because the viewer only allows certain file types.
- JSON downloads directly.
- In a normal browser, downloads behave exactly as in the Codex version.

**Joint sleeves between stacked sections (Sections → Joint sleeves).**

*What a sleeve is*
- A thin printed ring that slides inside two neighbouring sections at their shared rim. Half of it sits in the section below and half in the section above.
- Its outer wall is traced from the real inner wall of both sections, minus the gap. So it follows the pleats, aligns both parts and stops them turning.
- Moving away from the joint, the sleeve may only stay the same width or get narrower. That means it can always be pushed in from the rim and never locks behind a wider pleat.

*Settings, saved as `joints` in the project*
- Depth per side: default 12 mm, so the sleeve is 24 mm tall.
- Wall: default 1.6 mm.
- Gap per side: default 0.25 mm.
- Turning the sleeves on switches to the exploded view, where they show in orange.

*Checks*
- Each joint gets a line in Print readiness: its height, gap and weight.
- If a sleeve can't be made, the line says why:
  - match the rims first
  - remove the mounting plate at this joint
  - sleeves work between shade sections, not vessels
  - the opening is too small for the wall

*Export*
- "Joint sleeves · STL" saves one STL per joint, each standing on z = 0 and ready to slice.
- The assembly OBJ includes the sleeves in place.

*Engine and test results*
- The geometry is in `src/joints.js` (`JointEngine.sleeve`). It slices both meshes every 2 mm near the joint and samples 480 directions around the axis.
- On the floor-lamp preset: four closed sleeves, 19 g each, Ø137 mm across the pleat tips, 0.25 mm gap at the tightest point.
- Changing one section's pleat count shows "match the rims first", and undo restores the sleeves.

*Limits*
- On sections that widen quickly away from the joint (reverse folds), the sleeve only touches near the rim. The average gap there is about 5 mm. That is the cost of a sleeve that can be pushed in.
- For a tighter hold, glue it or use a deeper sleeve.
- Fit depends on your printer's accuracy. Print one sleeve first and adjust the gap.

## Audit fixes, 17 Oct 2026

The full feature audit is in `audit/`. Re-run it with `node audit/engine_audit.js` and `python3 audit/ui_audit.py`.

**Saving**
- A design with a section in an error state now reloads. Before, a reload silently replaced the whole project with a blank one.
- A saved design that really can't be read is kept under `foldlight.unreadable`, and the app says so.
- Older saves with a fractional repeat count are repaired when loaded.

**Checks that now measure the real part**
- **Real wall thickness.** The check reports the thinnest wall measured perpendicular to the surface, not the radial setting. Across 32 pattern and profile cases it is usually within 10 % of an exact measurement; the worst cases read 12 % thick and 22 % thin. It warns under 2 nozzle widths and fails under 1.
  - Example: the reference shade at a 1.6 mm setting is really about 0.81 mm.
  - Miura, divots, waterbomb and Ron Resch on curved profiles reach 0.25–0.35 mm.
- **Self-intersection.** An exact triangle-crossing test runs in a background worker, so the page doesn't freeze. Twisted Miura and divots, and the heavily twisted waterbomb, used to show "Closed solid" while crossing themselves. They are now flagged.

**Joint sleeves**
- The wall is now sampled every 0.25 mm. Every corner of the wall's cross-section and every mesh corner is treated as a hard limit, and each ring stays inside the next ring's limit.
- On all 15 patterns that can stack, an independent check (1,920 directions, every 0.2 mm) finds no point closer to the wall than the gap setting. Before, sleeves clipped the wall by up to 0.40 mm (Ron Resch) and 0.10 mm (divots).
- Exported sleeves use 1 mm rings for a closer fit. The preview uses 2 mm rings.
- A sleeve that is too deep for a section now gets a warning. Each section must hold the sleeves from both of its ends, plus any end plate, with 2 mm to spare.

**Straight panels**
- "Match rim" now works between straight-panel sections of different widths. The upper section's pleat depth is scaled so both rims have the same depth-to-width ratio.

**Smaller fixes**
- Repeat count and rows reject fractions.
- A section template with a long name can be imported again.
- Picking "Pleated hypar panel" from the dropdown clears the mount, as the gallery card already did.
- The Flip note only shows for reverse folds.
- Clicking a profile point without moving it no longer adds an undo step.
- **Square grid relief (new pattern).** Recessed square tiles separated by sharp grid lines, with a Bevel setting (low is steep walls, high is a gentle slope) and the existing Cell depth. A "Make tiles square" button sets Repeats from Pattern rows so tiles are about as wide as tall; choosing the pattern from the gallery does this for you. The row next to a mounting plate stays flat. Tested on 384 combinations of profile, plate, bevel, depth and smooth/straight line: every one is a closed solid with no self-intersections. A "Tiles go" setting sends the tiles In (recessed), Out (raised, which also widens the part by the cell depth) or In and out as a checkerboard. 1,152 combinations tested, all closed with no self-intersections. Note: the wall at the slopes is thinner than the setting, and the wall check shows it.
- **Zigzag crease height.** On Miura, divots, waterbomb and curved, the slider ran to 80 mm but the shape stopped changing after about 16–30 mm (the limit that keeps rows from overlapping). The slider now ends at that limit, so every position does something. On reverse folds with a two-point profile (drum, cone) there is no interior point to zigzag, so the control is hidden and the pattern note says to add a profile point.
- **Kresling tower depth.** Cell depth did nothing on the Kresling pattern. It now pushes alternate vertices of each inner ring inward, so the panels fold. At depth 0 the shape is unchanged. Checked on three profiles with and without a plate: all closed, and large depths with a plate are flagged by the self-intersection check.
- **No hole option.** The Mount tab has a "No hole · solid plate" checkbox. With it on, the end plate is a closed solid disc and the hole diameter field is hidden. Works on every pattern, vessels and straight panels, top or bottom. Tested on 204 pattern, profile and mount combinations; every one is a closed solid.
- The design is now saved the moment you close or switch away from the tab, so an edit made less than a second earlier is no longer lost.

**Requested changes**
- **Smooth profile line on every pattern.** A new Profile line setting (Profile tab) offers Straight or Smooth.
  - Smooth is a monotone curve through your points, the same curve the vessel designer uses. It never overshoots, so a waist point stays the narrowest diameter.
  - Hourglass and Lantern start smooth. The reference shade stays straight so it still matches the CAD.
  - Straight panels stay perfectly flat: 16 flat bands per segment, measured flat to within 2e-14 mm.
  - Turning Smooth off gives back exactly the same shape as before.
- **Pleated hypar panel removed** from the gallery and the pattern list. Older projects that use it still open.

**Phones**
- Undo and redo are visible again.
- The joint-sleeve settings are now in the scrolling section strip.

## Known limits
- Rebuilding the 5-section floor lamp takes about 1.5–1.8 s per slider step in a software-rendered browser; it will be quicker on a real GPU machine.
- On phones (400 px) the "Build a floor lamp" button sits inside the starting-shapes panel, which is hidden. Use the Starting shape menu on the Profile tab instead.

## Unchanged
`vase-engine.js`, `export-3mf.js`, the patterns and the exports are the Codex originals.

Codex files with small audit edits:
- `engine.js`: straight-panel rim matching only.
- `vase-ui.js`: template name length and the Flip note.
- `app.js`: listed above.

New files: `joints.js` and `checks.js`.

## Square grid: bevel distance and angle
- Replaced the single Bevel slider with **Bevel distance** (mm of slope run) and **Bevel angle** (° from the surface). They are linked through Cell depth: angle = atan(depth / distance). Editing either updates the other; changing depth keeps the distance and updates the angle. Angle is disabled at depth 0.

## Viewport lighting and more rows
- Viewport now uses a generated image-based environment (studio softboxes, overcast sky, warm evening, dark room) chosen from a selector next to Light on; remembered per browser.
- Pattern rows go up to 100 (was 24). Very high row counts on short parts trigger the existing "mount overlaps a row" message; lower the plate thickness or rows.

## Textures (16 new pattern families, now 28)
Honeycomb, dimples/hobnail, diamond knurl, fish scale, basket weave, brick, diagonal ripples, flowing waves, reeded flutes (random depth, seeded), Voronoi cells, cracked earth, soft noise, wood grain, **thickness map (lithophane)**, **pierced holes**, and **Voronoi lattice (organic)** – smooth rounded struts around irregular open cells.
- Built on a fine height-field (adaptive resolution), so the section stays a closed solid; end rims stay flat and the area next to a mounting plate is left plain.
- Shared controls: Tiles go in/out/alternating, Bevel distance/angle (where it applies), Seed, Max slope (limits steepness for printing), Fade strength with direction, and "Then change to" a second pattern at a chosen height.
- Lithophane: smooth outside, inner wall thins by Cell depth, never below 0.8 mm (two nozzle widths); check shows the thickness range.
- Pierced and Voronoi lattice: real cut-outs, boundary snapped to the shape contour and relaxed so holes are smooth; Hole closing sets web width; Edge rounding rounds both edges. Check reports open area and an estimated web width with a warning under 3 nozzle widths.
- "Make tiles square" is now "Fit tiles to rows" and uses the right shape ratio for honeycomb and dimples.
- Tested: 738 build combinations closed, 328 self-intersection checks plus 32 for pierced/lattice, all passing.

## Smoothness pass on textures
- Texture sampling raised (about 14 samples per tile for sharp-edged patterns, 10 for smooth ones, reduced automatically on very dense layouts) and the viewport uses smooth shading for texture patterns, so tile edges and waves no longer show stair-steps.
- Pierced holes and the Voronoi lattice now cut along the exact outline of the shape (contour cutting) instead of grid cells, so hole edges are smooth.
- Pierced fish scale, basket weave and cracked earth are inverted so the pattern lines stay as the connected web; floating pieces that would not print are removed automatically.
- Fixed a crash in the pattern panel for texture patterns (no zigzag control).
- Rebuilds on dense textures take up to about 2 seconds.

## Lamp base removed
- The lamp base (Base button, Assembly seating card, base preview, seating check and base in OBJ assembly export) is switched off everywhere: the controls are hidden and a saved project can no longer turn it on. Code is left inert so it can be restored.
## Flat band under mounting plates
- Square grid, Kresling, Nojima, tucks and Yoshimura now leave only about 1.3 × plate thickness plain next to a mounting plate (was a full pattern row).

## Crisp honeycomb and brick
- Honeycomb and brick meshes now use a grid aligned to the tile lattice: hex edges, bevel lines and corner diagonals fall exactly on mesh edges, and each cell picks the diagonal that follows the crease. Edges are straight and sharp. Bevel snaps to the grid step for these two patterns.

## Honeycomb rebuilt as true hexagon tiles
- Honeycomb is now meshed tile by tile: one flat floor hexagon plus one sloped strip per side, with a flat rim band. About 12k faces instead of 170k, so the Edges view shows only the hexagon outlines. Flat shading keeps the bevel crisp.

## Lithophane with your own image
- Thickness pattern now has "Your image". Upload any picture; bright areas become thin wall (glow), dark areas stay thick (never below 0.8 mm). Controls: image repeats around the shade, and a thin/thick switch. The image is stored in the project, resized to at most 1024 px.
- Textured surfaces now use crease-aware shading, so flat tile faces and bevels stay crisp instead of looking soft.
- Fish scale edges are now smooth ramps instead of hard cliffs.

## Hole edges are smooth now (Pierced and Voronoi lattice)
- Cause of the stair-steps: after removing floating islands, every open cell was overwritten with a constant, so each cut landed beside a grid node instead of between nodes. Only the floating islands are overwritten now, so cuts follow the real shape. Applies to every hole shape (all 17 pierced sources plus the Voronoi lattice); all build as closed solids with no self-intersections.

## Hole patterns always print as one piece
- Solid rim band (3–8 mm, blending smoothly into the struts) at both ends of every pierced section, so ends stay flat and joinable instead of ending in loose fingers or wavy edges.
- Connectivity check: if the holes would split the shade into separate rings (waves, basket, soft noise) or strand large islands, smooth vertical ribs are added automatically and the check list says so.
- Fixed: the open-area / web-width check for pierced patterns and the lithophane thickness check never appeared (their data was dropped when the part was rotated into place).

## Simpler studio: step flow
- New layout: a large 3D view with one panel of 4 steps (Shape → Pattern → Fitting → Export) and a Next button at the end of each step.
- **Advanced** switch in the header (remembered on this device). Off: only the main controls. On: twist, rotation, skew, slope, seed, fade, pattern change at a height, bevel angle, edge rounding, profile point table, joint sleeves, mesh size and other expert details.
- Visual pattern picker with rendered thumbnails grouped as Folds, Relief textures, Cut-outs, Light and Origami studies, replacing the dropdown plus hidden gallery. The current pattern shows as a card with a Change button.
- Sections now sit as a small stack on the 3D view (top section on top) with a ＋ to add one. Part / Stack / Exploded view buttons appear only when there is more than one section; section tools appear in Fitting only when needed.
- Print check is a pill on the 3D view (Ready to print / N to review / Fix before printing) that opens the Export step, where the issues are listed (passing checks are listed in Advanced).
- Mounting is chosen with three picture cards; colour with swatches plus a custom picker; starting shapes include the 5-section floor lamp.
- Removed from the interface: the Vase / shade designer option and its workflow switch (older projects that use it still open), the reference card, and long intro text.
- Hole shapes list trimmed to the ones that make clean cut-outs: basket weave, fish scale, soft noise and reeded flutes removed (they remain as relief textures).
- Cut-out edge rounding is capped so the cut edge stays at least 0.8 mm thick, and the wall check no longer misreads hole side walls as a 0.05 mm wall.

## Crisp crease lines on every relief texture
- Voronoi cells, cracked earth, dimples and fish scale: the mesh is now cut exactly along each crease (cell walls, plateau edges, scale rims). Every grid edge first gets a vertex where a crease crosses it, found by bisection on the texture itself, then each cell is split along those lines. Edges are true straight or curved lines instead of stair steps, and the solid stays closed. Their bevels are now linear, so the crease is a real edge. These textures also use a coarser base grid, so they rebuild faster.
- Basket weave and diamond knurl: the grid is lined up with the strands and diamonds.
- Diagonal ripples, waves and the other smooth textures: each grid cell is split along the direction that follows the texture (no more zig-zag), with a finer grid and smooth shading.
- Pierced holes: the solid rim bands and the automatic ribs now have straight edges with a small fillet into the holes, instead of wavy, stepped edges.
- Test fix: the self-intersection check in the engine tests was being given the wrong array format, so earlier "no self-intersection" results were not real. All textures, the honeycomb and every hole shape have been re-checked with the correct format and pass.

## Interface
- Sections moved to the top of step 1 (Shape), with a "Sections" label above the stack on the 3D view.
- Lithophane: a large "Upload an image" button sits at the top of the pattern settings; uploading switches the thickness pattern to your image.
- Origami studies trimmed to the clearly different ones (Nojima helix, Tucks and Miura divots removed from the picker; older projects still open).

## Reverse fold: flip at the top and bottom rims
- The bottom and top rims can now be flipped as well as the interior zigzag creases. A rim flip swaps which pleats point inward at that edge.
- New "Flip folds" chips in the Pattern step (Top rim · Crease 1 … · Bottom rim), visible without Advanced; the Flip buttons in the Advanced point table now work on the end points too.
- Rim matching between stacked sections accounts for rim flips, so matched joints still line up exactly (checked: 0.00 mm gap).

## Light fitting and bulb preview (Fitting step)
- New "Light fitting" picker: standard E27/E26, E14/E12 and B22 lampholders, IKEA pendant cord sets (HEMMA, SUNNEBY, HAVSDJUP, JÄLLBY, SKAFTET) and IKEA bases (SKAFTET 30 cm and 38 cm table bases; SKAFTET, KRYSSMAST and SKAFTET arched floor bases).
- Bulb picker: A60, G80, G95, G125, ST64 Edison, P45 golf ball, C35 candle (filtered to the socket's cap).
- Picking a fitting sets the mounting plate (top for pendants, bottom for bases) and the hole to suit the shade ring (E27 about Ø41 mm, E14 Ø29, B22 Ø27), with undo.
- The 3D view draws the socket, shade ring and bulb in place, with a see-through shade, and can show the lamp base or the cord. Light on makes the bulb glow.
- Checks: bulb-to-wall clearance (warn under 25 mm, error under 10 mm), bulb sticking out of the shade, plate hole vs shade ring, and shade weight vs the cord set's maximum load.
- IKEA heights, base diameters, cord lengths, loads and wattages come from ikea.com product pages; socket and bulb sizes are typical catalogue values and are labelled as such.

## Grid on / off
- New "Grid" button in the 3D view toolbar (next to Edges) hides or shows the floor grid; the choice is remembered on this device.

## Smooth mesh (subdivision)
- Export step, "Smooth mesh": Subdivision Off / ×1 (4× triangles) / ×2 (16× triangles), per section, applied to the 3D view and to every export.
- Loop subdivision with sharp creases kept: "Keep folds and crisp edges sharp" keeps edges sharper than 40° (fine-tune the angle in Advanced); "Round everything" smooths all edges. Rims and mounting-plate zones are never moved, so plates stay flat and stacked rims still match.
- Capped at 600,000 triangles (the level drops automatically and the panel says so). While dragging a slider or profile point the preview skips smoothing and rebuilds smoothed on release.
- Tested closed with no self-intersections on folds, pleats, flutes, honeycomb, brick and cracked earth. Voronoi cells with "Keep sharp" can cross itself on thin, steep walls; the print check flags this, and "Round everything" avoids it.
