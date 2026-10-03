Zoofus is a scrapbook you build out of your own photos. The interface is made of the same stuff as the stickers: paper scraps torn by hand out of old magazines, laid flat on a notebook page, held down with tape, typed on an old typewriter, in the faded warm colours of a 1970s–80s Popeye magazine. Users don't just consume that look: they make their own tape and their own sticker edges with the same tools.

Everything below is a rule a builder can follow. Recipes with code are in **Signature elements**, Tailwind wiring is in **Tokens & Tailwind**, screen layouts are in **Screens**, and unresolved points are in **Open questions**.

## Design principles

### 1. One name, no tagline

- Set "Zoofus" as one word in `wordmark` (Special Elite, 34px desktop / 26px mobile) in `ink-deep`. Use the `Wordmark` component only.
- Do not split it, stack it, colour its letters differently, put it on a sticker, or add a slogan, strapline, "beta" tag or descriptor, anywhere (auth, 404, emails, the browser title `Zoofus · My sticker book`).

### 2. Flat paper, low contrast between shapes, AA for text

- **No shadows.** No `box-shadow`, no `drop-shadow` used as a shadow, no elevation. Everything lies flat on the page like paper glued into a journal. The only `drop-shadow` in the system is the zero-blur focus trace, which is an outline, not a shadow.
- Shapes separate by **paper tone + the torn edge's pale fibre lip**. Neighbouring scraps use neighbouring tones (`scrap` next to `scrap-warm` or `scrap-cool`), never two saturated fills side by side.
- Overlays (dialogs, menus) sit on a flat loden scrim (`rgb(65 71 14 / .32)`), not on a shadow.
- No `#000`, no `#fff`, no saturated primaries. The darkest colour is `loden-900` and the lightest is `sheet-50`.
- Text still meets WCAG AA. Body text is `ink` on any scrap, headings are `ink-deep`, and hints are `ink-muted` on light scraps only. The pairs are checked in **Tokens & Tailwind**.

### 3. Torn from a magazine, never patterned

- Every container is a torn polygon pair from `tornPair(seed, {size})`: buttons, chips, inputs, cards, dialogs, menus, toasts, tooltips, swatches, the avatar frame and the masthead's bottom edge. Use no `border-radius` and no `border`.
- A real tear wanders. Each edge is built from layered noise: a slow bow and drift, a mid-scale wander, fine fibre jags and per-point grit. Its roughness changes along the edge, so one stretch is calm and the next is ragged. Edges get the odd asymmetric bite, and every edge of a scrap has its own character.
- The torn lip shows: a 0–5px pale band of paper core (`fiber`) appears and disappears along the tear. This is what makes it read as torn paper rather than a jagged shape.
- About a third of scraps keep one straight edge (`edges: 'auto'`), the way a clipping keeps the page edge or a scissor cut.
- Never use a zigzag, a repeating SVG edge, `border-image` or a sawtooth mask for UI chrome. Pinking-shear tape ends exist only as a user choice.

### 4. Typewriter voice, in both languages

- Special Elite (`--font-display`) is for the wordmark, headings, labels, buttons, chips and menu items. Courier Prime (`--font-body`) is for body, hints, inputs and metadata.
- Chinese uses **Xiaolai Mono SC (小赖字体 等宽)**. It is monospaced like Courier Prime, and its loose, slightly clumsy hand-written strokes match Special Elite's worn type better than a formal Song or Kai. The fallbacks are LXGW WenKai, then Noto Serif SC. See the CJK pairing card for alternatives. Raise line-height to 1.75 under `:lang(zh)`.
- Use sentence case everywhere. Uppercase is reserved for `kicker` ("NO. 02 · STICKER BOOK").
- The copy is short, plain and a little warm. Name the action ("Cut it out", "Download PNG", "Add to my tape roll"). Use no exclamation marks and no emoji.

### 5. Scrapbook, not skeuomorph

- Paper is suggested, not simulated: light grain (40%) inside each face, a tilt of a degree or so, and tape where something is held down. Use no curls, staples, paperclips or photographic textures.
- Rotation is seeded and small: `rot-text` ±0.4°, `rot-control` ±0.8°, `rot-card` ±1.5° and `rot-sticker` ±4°. Hover settles a piece to 0°, nudges it up 1px and shifts its tone slightly darker. Press pushes it down 1px and darker still.
- UI tape goes on at most two places per element and about six per viewport, never on buttons, chips or inputs.

### 6. The sticker is the hero

- The UI recedes so the user's stickers carry the colour.
- A sticker on screen is the exported PNG itself, made by the same `dieCut()` call. What you see is what you download.

### 7. Users make their own paper goods

- **Tape.** Users set the direction (any angle from −90° to 90°, with quick presets and a drag handle), length, width and see-through level, choose torn, cut or pinked ends, and design the print (`TapeStudio`). Saved tapes go into "My tape roll".
- **Sticker edges.** Users pick the shape (smooth, wobbly or torn), the width (0–160% of the auto width) and the fill: a plain colour or any pattern they design (`StickerEdgeStudio`).
- **Patterns.** One engine (`PatternEditor` → `PatternSpec`) powers both. It offers solid, stripes, dots, gingham, check and wave presets, plus two ways to make your own: an 8 × 8 **pixel** stamp and a freehand **doodle** tile.
- **Palette.** User designs draw from the system palette (16 user colours), so homemade tape and stickers still sit in the Popeye world. The UI's low-contrast rule does not apply to what users make.

## Do and don't

| Do | Don't |
| --- | --- |
| Separate scraps by tone and the torn lip | Shadows, elevation, 1px borders |
| A fresh seed per element, so every tear differs | One clip string reused on every button |
| Let one edge stay straight now and then | Four identical torn edges, or perfectly even jags |
| `ink` cocoa text, `ink-deep` headings | `#000`, `#333`, grey text |
| `accent` brick for the one primary action per view | Two brick buttons next to each other |
| Focus ring traced around the torn shape (`--focus-trace`) | `outline: auto` rectangles |
| Let users set tape angle, print and ends | Fixed tape that only the UI can use |
| "Zoofus" alone | "Zoofus — make stickers from anything" |

## Visual foundations, at a glance

- **Colour.** Use `ground` kraft for the page and `scrap` cream for most surfaces. `scrap-warm`, `scrap-cool` and `scrap-pink` are the variants. Use `accent` brick for primary, `accent-2` mustard for secondary, `selected` lime for on-states, `focus` plum for focus and destructive actions, and `fiber` for the torn lip.
- **Type.** Use the 10 styles in tokens, never below 12px. The CJK face is Xiaolai Mono SC.
- **Spacing.** Use a 4px base: `space-1` 4 … `space-16` 64. Page gutter is `space-4` on mobile and `space-12` on desktop. Pad any torn face by at least amp + lip (`tear-*`).
- **Depth.** There is none. Layers are told apart by tone, the lip, tape and the scrim.
- **Motion.** Use `dur-base` + `ease-paper` for settling and `ease-flop` for a sticker landing. Everything goes to 0ms under reduced motion.
- **Focus.** A 2px `sheet-50` halo, then a 2px `plum-900` ring, traced around the torn silhouette with zero-blur `drop-shadow`s. Plum reaches at least 5:1 on every ground.
- **Iconography.** Use 24px line icons with a 1.7 stroke and round caps, slightly uneven (`Icon`), in `currentColor`. There is no icon font and no emoji.
- **Imagery.** Only the user's photos and stickers.
