# Task for Claude Code, round 2: close the gaps and get release-ready

Read `design-system/ADOPTION_REPORT.md` (your round-1 report) and this file in full, then work through the phases in order, on your own. Stay on `dev` and commit after each phase. Before you start, tag the current state with `git tag ds-v2-round1`. Stop and ask only if a step would delete or rewrite existing user data, or deploy anything.

Append everything you do to `ADOPTION_REPORT.md` under a new heading, **"Round 2"**. Do not rewrite round 1.

---

## Phase 1. Update the design-system files

Copy these three files from this package into `design-system/`, overwriting the old ones:

- `components/bundle.js`
- `02-signature-elements.md`
- `components/Sticker/README.md`

**What changed and why.** The old border formula `clamp(4, 4.5% of long side, 28px)` breaks the rule that the screen matches the file. A 300px preview gets a 13px border (4.5%), but a 3000px export is clamped to 28px (0.9%), so the downloaded PNG has a much thinner edge than the preview. Pattern fills have the same problem, because their size was given in screen pixels. The corrected spec is:

```ts
export const EDGE_RATIO = 0.045;   // edge width as a fraction of the cut-out's long side
export const PATTERN_REF = 300;    // PatternSpec.scale is in px at a 300px long side
const L = Math.max(srcW, srcH);    // at the resolution being rendered
const bw = Math.round(L * EDGE_RATIO * edge.scale);        // no px clamp
const fillImg = patternSVG(edge.fill, outW, outH, L / PATTERN_REF);
```

Do this:

1. Find every place that computes a border width or pattern scale (`renderSticker`, `dieCut` callers, the edge studio's px readout, thumbnails) and switch them all to the formula above. Remove any px clamp. The edge-studio slider label shows the px value at the current preview size; that is fine.
2. Thumbnails and the book grid display the stored PNG scaled down. They must not call `dieCut` at a different size.
3. Add a **parity unit test**: render the same sticker at L = 300 and at L = 1200, downscale the 1200 result to 300, and compare. The mean absolute per-channel difference must be < 2% and the alpha-mask IoU must be > 0.97. Run it for every edge shape (smooth, wobbly, torn) with a solid fill and with a stripes fill. Use `@napi-rs/canvas` or `canvas` in Vitest; if neither works in CI, run it as a Playwright test in a real browser.

## Phase 2. Existing stickers (backward compatibility, non-destructive)

Stickers saved before round 1 have the border baked into one image and no `source` / `edge` / `seed`.

1. Detect legacy stickers and give them a typed `kind: 'legacy'` in the client model. They still display, download and rename normally.
2. On a legacy sticker, "Edit edge" is replaced by a quiet note: "Made before edge editing — cut it again to change the edge." Add the key in both locales.
3. **Do not** write a bulk migration. If you think one is useful, write `scripts/migrate-legacy-stickers.ts` with `--dry-run` as the default, have it print counts only, and do not run it against production.
4. Deleting a sticker must remove every stored object: source, rendered PNG and any thumbnail. Add an emulator e2e that proves no orphaned Storage objects remain.

## Phase 3. Data limits and security rules

User designs are free-form, so cap them in zod **and** in the Firestore/Storage rules. Add rules tests for each cap.

| Field | Limit |
| --- | --- |
| `TapeSpec.name` | 1–40 chars |
| tapes per user | ≤ 200 (enforce in the client; in the rules if cheap) |
| `PatternSpec.kind` | the 8 known kinds only |
| `bg`, `ink` | must be one of the 16 `USER_COLORS` names |
| `scale` | 6–28. `angle` 0–180. `weight` 0.1–0.9 |
| `pixels` | exactly 8 strings of 8 chars, each `0` or `1` |
| `strokes` | ≤ 60 paths, each ≤ 2,000 chars, matching `^[MLQCSTZmlqcstz0-9 .,-]+$` (no other characters, so no markup) |
| `edge.shape` | smooth, wobbly or torn. `edge.scale` 0–1.6 |
| sticker PNG upload | `image/png`, ≤ 10 MB, owner-only path |

Also: `patternMarkup` concatenates strings into SVG. Make sure doodle paths and colours can only come from validated values (the regex and the palette lookup), and add a unit test that feeds hostile input (`"/><script>`, `url(javascript:…)`) and asserts it is rejected or escaped.

## Phase 4. Finish verification

Extend `e2e/design-system.spec.ts`, or add new specs. Every item ends up as an automated test or a saved artefact in `design-system/verification/`.

1. **Reduced motion.** Use `page.emulateMedia({ reducedMotion: 'reduce' })` on all 23 states. Assert that the computed `transition-duration` and `animation-duration` are `0s` (or `animation-name: none`) on every element, and that the marching-ants `stroke-dashoffset` does not change over 1 second.
2. **Chinese.** Re-run all 23 states with the `zh-CN` locale and save screenshots to `verification/zh/{mobile,desktop}`. For every text node with CJK characters, use CDP (`CSS.getPlatformFontsForNode`) to assert that the rendered font is Xiaolai Mono SC, or LXGW WenKai as a fallback, and **never** a system serif or sans. Also check that no Chinese label is truncated or overflows its torn face: `scrollWidth <= clientWidth` on buttons, chips, tabs and menu items.
3. **Font loading.** In the English locale, assert in the network log that no CJK font files are downloaded on any screen.
4. **Contrast sweep beyond axe.** axe can't see through `clip-path` faces. For each visible text element, read its colour, then take the background colour from the nearest ancestor `.torn` face's computed `background-color` (or the page ground). Compute WCAG contrast and fail below 4.5:1, or below 3:1 for text ≥ 24px or bold ≥ 18.66px. Print a table of the lowest 20 pairs to the report.
5. **Torn-edge quality.** On each state:
   - no two visible `.torn` elements share the same `--clip` string (the seeds are unique);
   - for every torn face, the content inset is at least `amp + lip` for its preset, so tears never cut glyphs. Check this with `getBoundingClientRect` of the text versus the face, minus the preset depth;
   - the fibre lip exists: `--fclip` differs from `--clip` on every torn element that isn't a quiet button.
6. **Layout rules.** At most one primary (brick) button visible per view, excluding dialogs, which count separately. At most 6 UI tape pieces per viewport. Rotations stay within the token ranges, and disabled controls have 0°.
7. **PatternEditor unit tests:** every kind's `onChange` output; PixelGrid toggles with click, Space and Enter and updates `pixels`; Clear; DoodlePad pointer down/move/up produces one valid path; Undo removes the last stroke; and Paper, Ink and Size map to the spec.
8. **Gallery comparison.** For each component in `/dev/design-system`, screenshot it next to the matching card in `design-system/gallery.html` (serve it locally) and save a side-by-side contact sheet to `verification/compare/<Component>.png`. List every visible deviation in the report, then fix it or justify it.

## Phase 5. Interaction details

1. **Non-modal menus.** Since you switched the account menu and the mobile menu to non-modal, verify and test the following:
   - Esc closes the menu and returns focus to the trigger;
   - an outside click closes it;
   - Tab from the last item closes the menu and moves on;
   - the background is not scrollable on mobile while the menu is open (use a scroll lock, not `aria-hidden`).

   Keep Dialogs modal.
2. **Lasso in Konva.** Check it against `02-signature-elements.md` §7:
   - three strokes (a 5px loden halo at 28%, a 2px sheet base, 2px dashes);
   - dash `6 6` in select mode and `3 5` in deselect mode (in plum);
   - an offset cycle of 600ms that freezes under reduced motion;
   - the first-point ring;
   - the outside dimmed with loden at 38%.

   Screenshot it over three test photos (very dark, very light, busy) in `verification/lasso/` and confirm the line is visible on all three.
3. **Touch.** Check every interactive target is ≥ 44 × 44 at 390px, including the chips, the tape turn handle and the pixel cells: give the cells a larger hit area or a 6 × 6 layout on narrow screens. Check the canvas has `touch-action: none` and that the page does not scroll while drawing.

## Phase 6. Performance

Measure, then record before and after in the report:

- **JS bundle** gzip size (round 1 removed MUI, so it should shrink). Code-split `/tape`, the sticker maker and `/dev/design-system`.
- **Torn generation.** Time `tornPair` across the sticker book with 60 stickers (target: less than 8ms total on a mid-range mobile profile) and confirm the cache is hit on re-render.
- **dieCut.** Time a torn edge at a 2000px long side. If it takes over 150ms on the main thread, move it to an `OffscreenCanvas` worker with a main-thread fallback. Throttle the live preview to one render per rAF.
- **Lighthouse** mobile on Home and the sticker book: target Performance ≥ 85 and Accessibility 100.

## Phase 7. Owner decisions to apply

These are the answers to the open questions. Apply them, update `design-system/04-open-questions.md` to mark each one **Decided**, and remove any code that only existed for the rejected options.

| Question | Decision |
| --- | --- |
| Xiaolai family name | Use the exact `font-family` from the installed `font.css`. Write the real name into `01-tokens.md`, `theme.css` and the report |
| Navy vs plum | Plum (`plum-900`) stays the deep accent. Add no navy |
| Pinked tape ends | Keep them as a user-only option. Never use them in UI chrome |
| LXGW WenKai weight | Use 400 only. Drop 500 unless a screen needs bold CJK; if one does, list it |
| Torn lip colour | A fixed `fiber` token. Not user-settable in v1 |
| Google sign-in button | Follow Google's current **Sign in with Google** branding guidelines exactly. Fetch and read them first. Use the official button or an allowed custom variant with the unmodified "G" logo, the approved colours and the approved label. Do **not** tear, clip, rotate or recolour Google's button or logo. Place it inside our torn scrap row with normal spacing, and record it in the report as an intentional exception to the "everything torn" rule |
| Language switch | Keep the placement. Style it as a ToggleGroup "EN · 中文" in the account menu; signed out, a quiet button reading "中文" or "English" |
| Export size choice | Not in v1. Export at source resolution |
| Free colour picker | Not in v1. Users get the 16 palette colours only |
| Legacy stickers | As in Phase 2 |

## Phase 8. Release readiness (do not deploy)

1. Run the full suite: typecheck, lint, unit, rules, emulator e2e and the design-system e2e (English, Chinese, reduced motion).
2. Write `RELEASE_CHECKLIST.md` with:
   - the exact commands to deploy rules and storage (`firebase deploy --only firestore:rules,storage --project zoofus-48264`) and hosting;
   - a summary of the rules changes since the last deploy (diff `firestore.rules` and `storage.rules` against the last commit that was deployed, if you can identify it; otherwise against `ds-v2-round1~`);
   - a manual smoke test: sign up, cut, edit the edge, download, check the PNG edge matches, make a tape, delete the sticker, delete the account;
   - the rollback steps.
3. **Do not run any deploy command.** The owner will.

## Finish

Commit, push `dev`, and reply with:

- a short summary of each phase;
- the test counts;
- the lowest contrast pairs;
- the performance numbers;
- the deviations left from the gallery comparison;
- anything still needing the owner.

Do not paste whole files into the reply.
