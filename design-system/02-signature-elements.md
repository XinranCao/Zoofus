# Signature elements

Each recipe below matches the live code in `components/bundle.js`, which every preview runs. Copy the TypeScript into `src/paper/`. **Zoofus is flat: none of these recipes casts a shadow.**

## 1. Torn edge: "torn out of a magazine"

`tornPair(seed, opts)` returns **two** `clip-path: polygon()` strings:

- **face** — the printed surface of the scrap.
- **fiber** — a slightly larger outline behind it, filled with `fiber` (the pale core of the paper). Where the two differ you see the white lip that a real tear leaves. Where they meet the lip vanishes, and it comes and goes along the edge.

Each point mixes a **percentage along the edge** with a **pixel depth** (`37.2% 4.1px`, `calc(100% - 3.1px) 54%`), so one string fits any size without measuring. Only the point count depends on size, bucketed to 64px.

### How one edge is built

```
depth(t) = amp × ( bow·big(t) + 0.5·mid(t) + rough(t) × (0.55·fine(t) + 0.45·grit²) ) + slope·amp·t + bites(t)
lip(t)   = fiber × lipStrength × max(0.12, 1.7·fib(t) − 0.3) × (0.75 … 1.25)
```

| Layer | Noise | What it does |
| --- | --- | --- |
| `big` | 2–3 cells per edge | the slow bow of the tear |
| `slope` | −0.9…0.9 × amp | the whole edge drifts, so scraps are never square |
| `mid` | one cell per 38px | the hand's wobble while tearing |
| `fine` | one cell per 7px | fibre jags |
| `grit` | per point, squared | tiny random teeth, mostly small |
| `rough(t)` | 3–6 cells | roughness changes along the edge: calm stretches, then ragged ones |
| `bites` | 0–2 per edge | asymmetric bites (steep on one side, slow on the other), 5–27px wide, 1–2.6 × amp deep |
| `lip` | one cell per 18px | the pale fibre band, 0 to `fiber` px wide |

Every edge draws its own `bow`, `slope`, roughness bias and lip strength, so the four edges of one scrap never look alike. Value noise is seeded (mulberry32), so the same seed always gives the same scrap.

### Parameters

| Param | Meaning |
| --- | --- |
| `seed` | Element identity (record id, `useId()`) |
| `size` | `xs` `sm` `md` `lg` `xl` preset |
| `amp` | Depth range of the wandering tear (px) |
| `res` | Px between points (fine detail) |
| `nick` | Chance of bites on an edge (scaled by edge length) |
| `fiber` | Max lip width (px). `0` turns the lip off |
| `edges` | `'trbl'` (all torn), any subset, or `'auto'`: all torn but ~35% of scraps keep one straight cut edge |
| `flush` | Untorn edges sit exactly on the box (masthead) instead of a slightly skewed cut |
| `w`, `h` | Approximate size (point count only) |

### Presets

| Preset | amp | res | bites | lip | Used by |
| --- | --- | --- | --- | --- | --- |
| `xs` | 2.6 | 2 | 15% | 1.4 | chips, swatches, tooltips, avatar frame, slider thumb |
| `sm` | 3.6 | 2.5 | 25% | 2 | buttons, inputs |
| `md` | 5.5 | 3 | 40% | 3.2 | cards, toasts, menus, canvas well |
| `lg` | 7.5 | 3.5 | 50% | 4 | dialogs, auth card, hero, empty states |
| `xl` | 10 | 4 | 60% | 5 | masthead bottom edge |

Pad content by at least **amp + lip** (md: 9px, lg: 12px) so the tear never cuts glyphs.

### Code (core)

```ts
// src/paper/torn.ts
export const TEAR = {
  xs: { amp: 2.6, res: 2,   nick: 0.15, fiber: 1.4, w: 90,   h: 32 },
  sm: { amp: 3.6, res: 2.5, nick: 0.25, fiber: 2,   w: 150,  h: 46 },
  md: { amp: 5.5, res: 3,   nick: 0.4,  fiber: 3.2, w: 300,  h: 200 },
  lg: { amp: 7.5, res: 3.5, nick: 0.5,  fiber: 4,   w: 560,  h: 420 },
  xl: { amp: 10,  res: 4,   nick: 0.6,  fiber: 5,   w: 1280, h: 90 },
} as const;

export function vnoise(R: () => number, cells: number, periodic = false) {
  cells = Math.max(1, Math.round(cells)); const v = Array.from({ length: cells + 1 }, R);
  if (periodic) v[cells] = v[0];
  return (t: number) => { const x = Math.min(Math.max(t, 0), 1) * cells, i = Math.min(cells - 1, Math.floor(x)), f = x - i, u = f * f * (3 - 2 * f);
    return v[i] * (1 - u) + v[i + 1] * u; };
}

function tearEdge(R: () => number, len: number, o: Opts) {
  const n = Math.max(8, Math.min(420, Math.round(len / o.res)));
  const big = vnoise(R, 2 + Math.floor(R() * 2)), mid = vnoise(R, Math.max(4, len / 38)), fine = vnoise(R, Math.max(8, len / 7));
  const rough = vnoise(R, 3 + Math.floor(R() * 4)), fib = vnoise(R, Math.max(5, len / 18));
  const slope = (R() * 2 - 1) * 0.9, bow = 0.4 + R() * 0.9, roughBase = 0.15 + R() * 0.55, lip = 0.5 + R() * 0.8;
  const bites = R() < o.nick * Math.min(2, len / 160)
    ? Array.from({ length: R() < 0.25 ? 2 : 1 }, () => ({ t: 0.08 + R() * 0.84, w: (5 + R() * 22) / len, d: o.amp * (1 + R() * 1.6), lead: 0.2 + R() * 0.6 }))
    : [];
  const pts = []; let min = Infinity;
  for (let i = 0; i <= n; i++) {
    let t = i / n; if (i > 0 && i < n) t += (R() - 0.5) * 0.7 / n;
    const r = Math.min(1, roughBase + rough(t) * 0.9);
    let d = o.amp * (bow * big(t) + 0.5 * mid(t) + r * (0.55 * fine(t) + 0.45 * R() * R())) + slope * o.amp * t;
    for (const b of bites) { const x = (t - b.t) / b.w;
      if (x > -b.lead && x < 1 - b.lead) d += b.d * Math.pow(x < 0 ? 1 + x / b.lead : 1 - x / (1 - b.lead), 0.6); }
    pts.push({ t, d, fb: fib(t) }); min = Math.min(min, d);
  }
  for (const p of pts) {                       // normalise; lip sits between face and box
    const fw = Math.min(o.fiber, o.fiber * lip * Math.max(0.12, p.fb * 1.7 - 0.3) * (0.75 + 0.5 * R()));
    p.d = p.d - min + o.fiber; p.f = p.d - fw;
  }
  return pts;
}
// tornPair() stitches the four edges (top L→R, right T→B, bottom R→L, left B→T), sharing corner
// depths so corners are continuous, and builds one polygon from `d` (face) and one from `f` (fibre).
// Full source: components/bundle.js → tornPair(). Results are memoised per seed + size bucket.
```

### Wiring (flat)

```html
<div class="torn" style="--rot:.6deg; --clip: polygon(…face…); --fclip: polygon(…fibre…)">
  <div class="torn-face">…</div>
</div>
```

```css
.torn          { position: relative; transform: rotate(var(--rot)); }
.torn::before  { content: ""; position: absolute; inset: 0; background: var(--fiber-tone, var(--color-fiber)); clip-path: var(--fclip); }
.torn > .torn-face { position: relative; clip-path: var(--clip); background: var(--tone, var(--color-scrap)); }
.torn-face::after  { content: ""; position: absolute; inset: 0; background-image: var(--grain); opacity: .4; mix-blend-mode: multiply; pointer-events: none; }
/* focus: zero-blur traces = an outline that follows the tear (not a shadow) */
.torn:focus-visible, .torn:has(:focus-visible) {
  filter: drop-shadow(2px 0 0 var(--color-sheet-50)) drop-shadow(-2px 0 0 var(--color-sheet-50))
          drop-shadow(0 2px 0 var(--color-sheet-50)) drop-shadow(0 -2px 0 var(--color-sheet-50))
          drop-shadow(2px 0 0 var(--color-plum-900)) drop-shadow(-2px 0 0 var(--color-plum-900))
          drop-shadow(0 2px 0 var(--color-plum-900)) drop-shadow(0 -2px 0 var(--color-plum-900));
}
```

On `sheet-50` faces (inputs, avatar frame) set `--fiber-tone: var(--color-cream-100)` so the lip still shows. The wrapper is the Radix `asChild` target (button, trigger, input box).

**Performance.** About 150–300 points per scrap, around 4–8 KB of clip string. Strings are cached per seed and size bucket. Measure (ResizeObserver) only fluid containers.

## 2. Paper scrap surface

- **Tone.** Use `scrap` (cream) by default. Alternate `scrap-warm`, `scrap-cool` and `scrap-pink` between neighbours. The masthead is `peach-100`.
- **Grain.** Inline SVG `feTurbulence`, tinted cocoa, tiled 160px, at **40%** multiply inside the face. It is texture, not depth.
- **Separation.** Tone plus the lip. Nothing floats.
- **Rotation.** Seeded within the Tokens ranges. Hover settles to 0°, moves −1px and darkens the face (`brightness(.95)`). Press moves +1px and darkens further (`.9`). There is no transition under reduced motion.

## 3. Tape: placed and printed by the user

| Property | Range | Default |
| --- | --- | --- |
| Direction (`angle`) | −90° … 90°, any value. Presets −45, −15, 0, +15, +45, +90. A drag handle on the tape's end. Arrow keys ±5° | seeded ±8° for UI tape |
| Length | 40–220px | 72 (UI), 130 (studio) |
| Width (`thickness`) | 12–36px | 20 |
| See-through (`opacity`) | 50–100% opaque, plus `mix-blend-mode: multiply` | 82% |
| Ends | `torn` (torn short ends, long edges straight like real tape) · `cut` · `pinked` (zigzag shears: a user choice only) | torn |
| Print | any `PatternSpec` (see §8) | — |

```tsx
<Tape pattern={{ kind: "dots", bg: "pink-200", ink: "sheet-50", scale: 9, weight: .35 }}
      angle={-14} length={130} thickness={22} opacity={.82} ends="torn" x="50%" y="0" />
```

The print is an inline `<svg>` `<pattern>` filling the strip, which is then clipped by the end shape and rotated. **UI presets:** `tape-mustard` (solid masking), `tape-celery` (lime stripe), `tape-pink` (dots), `tape-apricot` (solid), `tape-gingham`.

**UI rules.** Use tape on dialogs (two pieces), the auth card and empty states (one), toasts (one small piece), pinned stickers and the hero. Never on buttons, chips, inputs or menus, and no more than about six per viewport. In user pages (collage, journal) there are no limits.

**Data model:**

```ts
type TapeSpec = { id: string; name: string; pattern: PatternSpec; thickness: number; opacity: number; ends: "torn" | "cut" | "pinked" };
type TapePlacement = { tapeId: string; x: number; y: number; angle: number; length: number }; // per page / sticker
```

## 4. Die-cut sticker: user-chosen edge

The border is **baked into the bitmap** by `dieCut()`, and the UI shows that bitmap, so screen and PNG match. **No shadow**, on screen or in the file.

| Control | Options |
| --- | --- |
| Edge shape | `smooth` (±6% radius), `wobbly` (three-sine wobble, ±28%: the default), `torn` (layered noise, ragged zones, bites, plus a pale lip in `fiber`, or kraft when the fill is white) |
| Width | `bw = clamp(4, 4.5% of max side, 28) × scale`, with scale 0–1.6. 0 means no edge |
| Fill | any `PatternSpec`: a plain colour or a user pattern (§8) |

```ts
dieCut(src, { shape: "torn", border: bw, color: "#fbf6ee", fill: patternImage /* or null */, fiber: "#e8ddd0", seed })
```

**How it works.**

1. Make the silhouette of the cut-out.
2. Stamp it around the edge-radius function `r(a)` at 3 rings. Use 720 stamps for torn and `4 × bw` for the others. This produces a mask.
3. Torn only: stamp again at `r(a) + lip(a)` and paint that in the lip colour.
4. Paint the mask with the colour, or with the pattern image via `source-in`. The pattern is rendered once as an SVG at output size: `patternSVG(spec, w, h, dpr)`.
5. Draw the cut-out on top.

**Export.** Run at source resolution and save as a transparent PNG with the border baked in. The saved record keeps `{ edge: { shape, scale, fill }, seed }`, so the user can re-edit the edge later.

**Performance.** A torn edge is about 4,300 `drawImage` calls (720 stamps × 3 rings × 2 masks), roughly 20–40ms at 300px. Move exports over 2000px to an `OffscreenCanvas` worker. Throttle the studio's live preview to one render per animation frame.

## 5. Hand-drawn underline & dashed divider

The SVG uses `viewBox="0 0 200 8"` and `preserveAspectRatio="none"`, with `vector-effect: non-scaling-stroke` so the stroke stays 1.6px at any width. Points fall every 16 units with ±2.2 units of vertical jitter, joined by quadratic curves. The jitter is seeded.

| Use | Stroke | Colour | Extra |
| --- | --- | --- | --- |
| Input underline (rest) | 1.6px | `doodle` @ 55% | inside the field, 6px from the bottom |
| Input focus | 1.6px | `plum-900` 100% | plus the traced focus ring |
| Input error | 1.6px | `raspberry-600` 100% | `wave` variant: alternate ±2 units |
| Quiet button hover, nav current | 2px | `ink` | appears on hover, fixed for `aria-current` |
| Divider | 1.6px | `doodle` @ 55% | `stroke-dasharray: 7 5 3 6 9 5` (irregular, never `4 4`) |

An absolutely positioned SVG needs an explicit `width: calc(100% - Npx)`. `left` + `right` do not stretch replaced elements.

## 6. Notebook ground

```css
.ground {
  background-color: var(--color-ground);                         /* kraft #e8ddd0 */
  background-image: var(--grain),
    radial-gradient(circle at 1px 1px, var(--color-dot) 1.1px, transparent 1.6px);   /* cocoa @15% */
  background-size: 160px 160px, 22px 22px;
}
```

The dot grid has a 22px pitch, which is subtle enough to read as paper rather than graph paper. Dialog scrims are a flat `rgb(65 71 14 / .32)` (loden), not black and not a shadow.

## 7. Marching-ants lasso

Three stacked strokes on the same path keep the line visible over any photo: dark, light, busy or the same colour as the line.

| Layer | Stroke | Colour | Dash |
| --- | --- | --- | --- |
| Halo | 5px | `loden-900` @ 28% | none |
| Base | 2px | `ants-a` (sheet-50) | none |
| Ants | 2px | `ants-b` (loden-900). In deselect mode `ants-deselect` (plum-900) | `6 6` (select), `3 5` (deselect) |

The dash offset animates `0 → -12` linearly over `ants-speed` (600ms) and freezes under reduced motion. Use `vector-effect: non-scaling-stroke` so zooming the canvas keeps a 2px line. Outside the closed selection, dim the photo with `rgb(65 71 14 / .38)` using an even-odd path. The first point is a 4.5px `sheet-50` dot with a 2px loden ring, which marks where to close the loop. Select mode shows a `+` cursor and deselect a `−` cursor. The mode is shown in the toggle and in the dash pattern, never by colour alone.

## 8. Pattern engine (tape prints + sticker-edge fills)

One spec, three renderers: inline SVG for the UI, an SVG image for canvas (`patternSVG`), and the same markup for thumbnails in "My tape roll".

```ts
type PatternSpec = {
  kind: "solid" | "stripes" | "dots" | "gingham" | "check" | "wave" | "pixels" | "doodle";
  bg: PaletteName;      // paper colour, one of the 16 user colours
  ink: PaletteName;     // print colour
  scale: number;        // 6–28px repeat
  angle: number;        // 0–180°, patternTransform rotate
  weight?: number;      // 0.1–0.9 stripe width / dot size / line weight
  pixels?: string[];    // 8 rows of "01" (pixels kind): one cell = scale ÷ 4
  strokes?: string[];   // SVG path data in a 48 × 48 tile (doodle kind), repeated at 4 × scale
};
```

| Kind | Tile |
| --- | --- |
| solid | `bg` only |
| stripes | ink bar `scale × weight` wide, rotated by `angle` |
| dots | staggered dots, radius `scale × (0.12 + 0.3·weight)` |
| gingham | two half-transparent bands (horizontal + vertical) |
| check | two ink squares per tile |
| wave | a stroked sine, stroke grows with weight |
| pixels | the user's 8 × 8 stamp (PixelGrid editor: tap cells, Clear) |
| doodle | the user's freehand strokes on a 48-unit tile (DoodlePad: draw, Undo, Clear), round caps, weight sets stroke |

**User colours (16):** sheet, cream, peach, blush, pink, celery, lime, mustard, apricot, rose, olive, tangerine, brick, plum, moss, cocoa. The near-fluorescent tones (orange-500, chartreuse-400, hotpink-300, magenta-500) are not offered, which keeps homemade prints faded.

**Accessibility.** Pixel cells are buttons (`aria-pressed`, "Row 3 column 5"). The doodle pad has an accessible name, and the pattern presets are a radiogroup, so anyone who cannot draw can still make a pattern from presets and pixels.
