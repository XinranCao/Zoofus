# Zoofus design system — package

1. Unzip into the root of your Zoofus repo and rename the folder to `design-system/`.
2. Open Claude Code in the repo and paste the prompt from `CLAUDE_CODE_PROMPT.txt` (or just: "Do the task in design-system/CLAUDE_CODE_TASK.md").
3. To browse the components offline: `npx serve design-system` → open `/gallery.html`.

Contents
- README.md — principles, do/don't (start here)
- 01-tokens.md · 02-signature-elements.md · 03-screens.md · 04-open-questions.md
- tokens.json (source) · tokens.css (generated CSS variables)
- components/bundle.js · bundle.css — working reference implementation (not for import)
- components/<Name>/README.md — spec per component; preview.html — live example
- components/index.d.ts — types
- gallery.html — all previews in one page
- CLAUDE_CODE_TASK.md — the full instructions for Claude Code
- CLAUDE_SNIPPET.md — lines to add to CLAUDE.md
