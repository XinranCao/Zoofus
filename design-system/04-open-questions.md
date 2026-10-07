# Open questions

Places where the brief conflicts with itself or leaves a decision open. The system's current assumption is noted for each.

1. **"Scrap on navy" with no navy in the palette.** The brief asks for a check of scrap on navy, but none of the 23 colours is navy, and a navy would also break the warm faded palette. **Assumption:** `plum-900` #7a0e4d plays the deep-accent role (focus ring, destructive fill). Cream on plum is 8.58:1. If you want a real faded navy, something like #2f3b52 would need adding and checking.
2. **Colour names are masked ("Xxxxxxxxx").** The system names each colour by hue plus a lightness step (`brick-600`, `cocoa-800`…). Send the intended names if they matter, and the tokens can be renamed without changing any value.
3. **No white, but stickers need a white border.** "No pure black" was stated, and "white cut borders" for stickers. **Assumption:** add one warm off-white, `sheet-50` #fbf6ee, used for the sticker border, input fills and text on brick/plum. It is the only colour outside the owner's list.
4. **"Low contrast" vs WCAG AA.** Brick (`accent`) is the one fill where the two pull against each other: cream on brick is only 4.53:1. **Assumption:** labels on brick use `sheet-50` (5.15:1). Making the primary softer (e.g. `apricot-300`) would need loden text and would read less like a primary.
5. **Several palette colours are saturated.** `orange-500`, `chartreuse-400`, `hotpink-300` and `magenta-500` clash with "no saturated primaries". **Assumption:** they stay in the palette for tiny doodles and illustration only. They are not offered in the user pattern palette or used for UI fills. Confirm, or drop them.
6. **Raspberry vs plum for errors.** Raspberry on kraft is 4.12:1 (fails as small text). **Assumption:** error text is plum, and raspberry only marks the field (wave, icon).
7. **Chinese font.** Xiangcui Typewriter was rejected as too heavy and formal. **Current pick:** Xiaolai Mono SC (小赖字体 等宽), which is monospaced, hand-written and OFL, from `cn-fontsource`. Alternatives are on the CJK pairing card: LXGW Marker Gothic (chunkier, for headings) and LXGW WenKai (calmer). Please pick one after viewing the card in your browser. The card loads the fonts live from jsDelivr, so if a row says "not loaded here" your network blocked it. The `cn-fontsource` family name is assumed to be `"Xiaolai Mono SC"`; confirm it on install.
8. **Focus ring.** A solid sheet-plus-plum ring traced around the torn shape with zero-blur `drop-shadow`s. This is an outline, not a shadow, so it is kept even in the flat system. A dashed version needs an SVG overlay built from the same points.
9. **Sticker export.** Exports are transparent PNGs at source resolution with the user's edge baked in and never a shadow (the system is flat). Should there be a size choice (512 / 1024 / original)?
10. **Collage / journal pages.** They are mentioned as later work and are not specified here. The Paper, Tape and Sticker primitives are meant to carry over: stickers at `rot-sticker`, pages as large `scrap` sheets on the notebook ground.
11. **Sticker book status on Home.** The brief says "(soon)". **Assumption:** Home shows "Recently cut" when the book exists, and a tape-labelled "Soon" section until then.
12. **Avatar shape.** Avatars are round photos inside a small torn sheet-white frame, which keeps both "photo" and "no regular outline". Confirm, or switch to a fully torn photo scrap.
13. **Wordmark weight.** Special Elite has a single weight, so the wordmark relies on size alone. Should there be a custom lettered wordmark later? If so, it should come from the owner, not be redrawn here.
14. **Flat vs. depth for overlays.** With no shadows, dialogs and menus are separated by the loden scrim, the torn lip and tape. If menus over busy photos ever get lost, the fix is a stronger tone change, not a shadow.
15. **Where user patterns live.** A user's tapes and edge patterns are stored per account (`TapeSpec[]`, `PatternSpec` on each sticker). Should they be shareable between users, or importable from a photo (e.g. "make a tape from this sticker")?
16. **User colours.** Homemade prints are limited to 16 palette colours, with the four near-fluorescent tones removed. Should users get a free colour picker? It would let homemade tape break the faded look.
17. **Pinked tape ends.** These are allowed as a user choice even though UI chrome bans regular zigzags. Confirm, or drop them.
18. **Torn sticker edges.** The torn shape shows a pale lip (kraft-coloured when the fill is white). Should the lip colour be user-settable too?

---

## Decided (round 2)

The owner's answers, applied in the app. Everything below is **Decided**.

| # | Question | Decision | In the app |
| --- | --- | --- | --- |
| 1 | Navy vs plum | **Decided.** Plum (`plum-900`) stays the deep accent. No navy. | No navy anywhere in `src/`. |
| 7 | Xiaolai family name | **Decided.** The exact `font-family` in the installed `font.css` is `Xiaolai Mono SC`. | Written into `01-tokens.md`, `src/styles/theme.css`, and the report. Verified by the CDP font check in `e2e/design-system.spec.ts`. |
| 7 | LXGW WenKai weight | **Decided.** Regular only. The `@fontsource/lxgw-wenkai` package ships 300, 500 and 700 and **no 400**, so the nearest, 500, is imported as the only weight, as a fallback for glyphs Xiaolai lacks. No screen needs bold CJK. | `src/lib/cjkFonts.ts` |
| 9 | Export size choice | **Decided.** Not in v1. Export at source resolution. | No size UI. |
| 16 | Free colour picker | **Decided.** Not in v1. The 16 palette colours only (zod, Firestore rules and UI). | `USER_COLORS`, `firestore.rules` |
| 17 | Pinked tape ends | **Decided.** Kept as a user-only option; never used in UI chrome. | Only the tape studio offers it; every UI `Tape` is torn. |
| 18 | Torn lip colour | **Decided.** A fixed `fiber` token, not user-settable in v1. | `--fiber`; `renderSticker` chooses the sticker lip itself. |
| – | Google sign-in button | **Decided.** Follow Google's current Sign in with Google branding guidelines exactly (light theme, official label, unmodified "G"). **An intentional exception**, kept after review (October 2026), to "everything is torn": it is not torn, clipped, rotated or recoloured, and it also has the white fill and 1px border Google specifies. It sits inside the torn auth card with normal spacing. | `src/components/ui/GoogleButton.tsx` |
| – | Language switch | **Decided.** Same placement. In the account menu a segmented "EN · 中文"; signed out, a quiet button reading "中文" or "English". | `src/components/ui/Masthead.tsx` |
| – | Legacy stickers | **Decided.** Typed `kind: 'legacy'`; they display, download and rename; "Edit edge" is replaced by a note. No bulk migration. | `sticker.schema.ts`, `StickerDetailDialog.tsx` |

## Decided (round 3, v1.8.0)

| # | Question | Decision | In the app |
| --- | --- | --- | --- |
| 10 | Collage / journal pages | **Decided and built.** Pages are the journal studio: a sheet on the notebook ground with stickers, tape, text and pen lines. Desktop, tablet and phone layouts are in `03-screens.md`. | `src/features/journal/` |
| 11 | Sticker book on Home | **Decided.** Home is a desk with four layouts; the landing page is the signed-out front door. | `src/features/home/` |
| – | Tagline | **Decided.** The wordmark stays alone. The landing's `h1` "Turn your photos into stickers." is page copy and may stay. | `LandingPage.tsx` |
| – | A Chinese name for Zoofus | **Decided.** None. Zoofus is written as "Zoofus" in Chinese text too, with no reading. | `src/i18n/locales/zh.ts` |
| – | Price | **Decided.** "Free to use." / 免费使用。 near the main button and in the privacy line. A price is never shown. | landing copy |
| – | Platforms named | **Decided.** The Chinese landing may name 微信 and 小红书; the English one does not name apps. | landing copy |
| – | Friends and Together terms | **Decided.** 好友 for friends (never 朋友); the nav reads "Journal together" / 一起做手账. | `locales.test.ts` bans the old words |
| – | Phone journal editor | **Decided.** Under 500px: a one-row top bar (arrow, title, save line, Save, More), a fixed bottom tool bar, and a sheet for the selected thing. | `components.css`, `JournalStudio.tsx` |
| – | Pen realism | **Decided.** Pencil, marker and crayon get real textures; the pen stays clean. Strokes stay vectors. | `penTexture.ts` |
| – | Tile pictures | **Decided.** Tiles use small WebP pictures; the full file is for the open view and the page. | `smallPicture()` |
| 15 | Sharing user patterns | **Still open.** Tapes and edge prints are copied when a friend keeps a shared tape or sticker; there is no "make a tape from this sticker" yet. | – |

