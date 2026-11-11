# Animal atlas

`animal-atlas.png` was generated with an AI image generation tool from the approved Tab Zoo UI concept on 2026-09-11. This is a generated reconstruction, not a pixel-identical crop of the concept image.

Final generation prompt:

> Extract the seven animal designs from the LEFT habitat into a transparent-background sprite atlas. Faithfully preserve their pixel art designs, proportions and colors; do not redesign. Square 1024x1024 PNG, transparent alpha. Invisible 4 columns x 2 rows, equal cells. Row 1: green long-neck dinosaur facing right; red T-rex facing left; blue duck facing left; orange fennec fox facing left (full side profile, head and body same direction). Row 2: charcoal triceratops facing left; blue-violet elephant facing left with straight trunk; white resting cat with open eyes; empty cell. Center each animal in its cell, maximum 210px wide and 230px tall, align foot baselines at 400px for upper row and 912px for lower row. Exact sprite appearance from reference with dark pixel outline. No text, UI, grass, labels, selection indicators, shadows, Z or ground. Truly transparent, not checkerboard. This is production game sprite extraction, all animals isolated, sharp square pixels.

The generator returned an opaque 1254×1254 image. SVG clip geometry in `../atlas-clips.js` excludes the connected gray background at render time; the source PNG is unmodified. `../../tests/build-atlas-clips.ps1` regenerates the geometry. `../sprite-art.js` controls framing, palette filters, left-facing normalization and sleep-eye overlays.

Previous vector artwork and a complete popup snapshot are preserved in `../../design-archive/pixel-before-atlas/`.

## Redrawn adults and sleeping poses

`animal-redraw-atlas.png`: generated original pixel artwork. Preserves the approved silhouettes with larger adult dinosaur heads and seven complete sleeping poses. Final edit removes highlights and excess modeling shadows for flatter color fills. Adult heads are part of the full drawing; no enlarged head fragments. Source PNG is preserved intact; build-atlas-clips.ps1 generates background exclusion geometry for both sheets.
