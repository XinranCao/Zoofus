# Zoofus UI style brief (for the design pass)

## Product

Zoofus is a web app where you upload a photo, lasso (freehand or shapes) the part you want, and cut it out as a **sticker**. The stickers go into a personal sticker book and later onto collage / journal pages. Bilingual users (English and Chinese). The UI itself should feel like the stickers: a hand-made scrapbook.

## Style direction (decided)

A mix of three worlds, with the Japanese magazine **Popeye** (vintage American casual, city-boy magazine) as the colour and layout anchor:

1. **Torn-paper poster / magazine collage (手撕海报/杂志)**: scraps of paper taped down, uneven hand-torn edges.
2. **Hand-drawn journal (手绘手账)**: washi tape, wobbly hand-drawn lines, doodles, stickers with white cut borders.
3. **Popeye magazine**: faded Americana palette, confident typographic layout, a little humour.

Reference preview already built and reviewed: https://claude.ai/artifact/XhnZJFg4NN4CKgxYB2nmj4 (private; the owner can open it). Keep its spirit, and improve or extend it.

## Hard requirements from the owner

1. **"Zoofus" is one complete name.** One wordmark, never split into parts. **No slogan or tagline anywhere.**
2. **Low contrast between elements.** Soft and faded, not punchy. No pure black, no saturated primaries, no hard offset shadows. Shapes are separated by soft shadows and paper tone, not by heavy outlines.
3. **No regular, patterned outlines.** Edges must look hand-torn and irregular: uneven depth, uneven rhythm, the odd deep nick. Avoid repeating zigzags, perfect rectangles, uniform rounded corners and uniform borders. Buttons, chips, cards, panels, dialogs, inputs, swatches and the masthead all follow this.
4. **Typewriter type.** Special Elite (headings, labels, buttons) and Courier Prime (body). Chinese falls back to a serif (Noto Serif SC) because typewriter fonts have no Chinese glyphs. Ask for a better CJK pairing if you know one that is free and on Google Fonts / @fontsource.
5. **Popeye-like palette**, faded and warm. Starting values (tune them, keep the mood): newsprint ground #ece2cc, scrap/page #f6f0e1, soft ink #3b352e, secondary ink #6f655a, work navy #3f5774, denim #7b97ad, brick red #c4624b, mustard #dcb256, olive #8d9a64, kraft tan #cdb48c, blush #e6bdae.
6. Light theme only (one committed look). Must still meet WCAG AA for text, so check ink on scrap, scrap on brick, scrap on navy.

## Signature elements to specify precisely (with CSS/SVG recipes I can implement)

- **Torn edge**: how it is generated (we will use a small JS function that builds a deterministic `clip-path: polygon(...)` per element from a seed, with parameters: amplitude, step size, nick probability, which edges are torn). Soft shadow must live on a parent wrapper (`filter: drop-shadow`) because `clip-path` clips shadows. Give default amplitudes per component size.
- **Paper scrap** surface: tone, subtle grain/noise, slight rotation rules (range of degrees, hover/active behaviour).
- **Tape** (washi / masking): colours, opacity, size, how it is placed and rotated, rules for when to use it.
- **Die-cut sticker**: wobbly white border around a cut-out image, soft shadow. This is the core output of the product, so it matters most. Specify how the border width and wobble scale with sticker size, and how it renders on a `<canvas>` export (PNG with transparency) so the exported sticker matches the UI.
- **Hand-drawn underline / dashed divider** for inputs and separators.
- **Notebook ground**: background paper, dot grid or grain.
- **Marching-ants lasso** line colour and weights over arbitrary photos (needs contrast on any image).

## Screens and components to cover

- Masthead / nav: wordmark, links, avatar (profile photo or default), mobile menu.
- Auth: Log in, Sign up (step 1 email+password, step 2 nickname + profile photo), password-reset dialog, error and loading states.
- Home: entry into the sticker maker, plus (soon) the sticker book grid.
- Sticker maker dialog: image upload, canvas with lasso/shape tools, mode toggle (select / deselect), shape picker (freehand, triangle, rectangle, star), delete / undo / redo / reset, confirm, result view with border colour + width controls and a Download PNG button. Include empty, loading and error states.
- Sticker book (new): grid of saved stickers, empty state, delete and rename, sticker detail.
- Shared: buttons (primary / secondary / quiet / disabled), chips and toggles, text inputs, sliders, colour picker popover, dialogs, toasts, tooltips, avatar menu, loading indicators, empty states, error pages (404).

## Tech constraints (so the guide is implementable)

React 19 + TypeScript, Tailwind CSS v4 (design tokens as CSS variables in `@theme`), Radix UI primitives for behaviour and accessibility, fonts self-hosted via @fontsource. No design-tool exports, no images for UI chrome unless inline SVG. Must be responsive from 360px wide to desktop. Respect `prefers-reduced-motion`. Keyboard focus must be visible and in style (for example dashed torn outline). Performance: many torn edges on one page, so the generator must be cheap and cached.

## What I need back

1. A short design principles page (do and do not, with the five hard requirements above).
2. Tokens: colours (with contrast pairs checked), type scale, spacing, shadows, rotation/jitter ranges, motion, as CSS variables ready for Tailwind `@theme`.
3. Specs for each component above: anatomy, states (default, hover, active, focus, disabled, error), sizes, and the CSS/SVG recipe.
4. Page layouts for each screen at mobile (~390px) and desktop (~1280px).
5. Exact recipes for the signature elements, with the parameters the torn-edge generator should expose.
6. Open questions or anything in the brief that conflicts.
