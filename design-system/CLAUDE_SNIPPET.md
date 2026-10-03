## Design system (Zoofus)

- UI follows `design-system/` — read `design-system/README.md` first, then the component's `design-system/components/<Name>/README.md`.
- Hard rules: one "Zoofus" wordmark, no tagline · flat, no shadows · every container is a seeded torn polygon pair (`src/paper/torn.ts`), no border-radius/borders on chrome · AA text contrast using the pairs in `design-system/01-tokens.md` · Special Elite + Courier Prime, Chinese in Xiaolai Mono SC · light theme only · reduced-motion respected · focus ring traced around the tear.
- Tokens live in `src/styles/theme.css` (Tailwind v4 `@theme`); never hard-code hex values in components.
- Sticker preview and PNG export both come from `dieCut()` (`src/paper/dieCut.ts`); never add a shadow to stickers.
- Tape and sticker-edge prints use `PatternSpec` (`src/paper/pattern.ts`); user colours are the 16 `USER_COLORS`.
- Visual reference: `npx serve design-system` → `gallery.html`.
