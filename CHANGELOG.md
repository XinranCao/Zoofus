# Changelog

## Unreleased

### Fixes

- **PM-v1.7.6-001: the login page loads 109 kB less JavaScript.** `ThumbHealer` (mounted for every signed-in page) imported the whole drawing stack; it now loads that part (`ThumbMaker.tsx`) only when a journal needs a page picture. Initial JavaScript (gzip): 538 kB → 416 kB (1024-byte kB; 424 kB in 1000s). Paper grain is now `src/styles/grain.webp` (18.7 kB, was a 63 kB PNG in `public/`), hashed into `/assets` and cached as immutable. `npm audit fix` cleared the one high finding (`source-map-js`); Tailwind and the Testing Library packages moved to `devDependencies`. CI runs `npm audit --omit=dev --audit-level=high` and `npm run check:bundle` (budget 440 kB, no Konva in the entry).

- **PM-v1.7.6-002: a save no longer re-reads every journal, and has a maximum wait.** After a save or a page-picture heal the cached Journals list is patched (title, updated time, picture, moved to the front) instead of invalidated, which had re-downloaded every journal with all its items each time. The items write is never later than 15 s after the first unsaved change (it used to wait for a pause), the picture never later than 30 s (and still 20 s apart); both come from a small tested scheduler (`saveScheduler.ts`). A journal whose picture could not be made is remembered for a day in `localStorage` (`zf-heal-failed`) instead of being retried on every visit. `saveJournal` and `setJournalThumb` now return the new picture's path and link.

- **PM-v1.7.6-003: the "drawImage on a canvas of 0 size" console error is gone.** A pen line being drawn (pencil, marker, crayon) gives each step's canvas back to the browser; it did so in an effect cleanup, which also runs when React mounts a component twice in development, so a canvas still on the page was emptied and Konva drew it (a `pageerror`). The previous canvas is now released only after the new one has replaced it. A new e2e opens a journal, places a sticker, tape, text and all four pens, saves and reloads, and fails on any page error or console error.

- **PM-v1.7.6-004: signing in reads only what the first screen shows.** Home reads the 12 newest stickers (`useRecentStickers`, was every sticker); the Library reads 40 at a time with a "Show more" button (`useStickerPages`; a `/stickers?edit=<id>` link to a sticker past the first page fetches that one by id); starting a journal counts journals on the server (`getCountFromServer`, only while the dialog is open) instead of reading them all, and the page-picture healer now works only on journals another screen has already loaded; the friends list is read only when the Start-a-page dialog opens; the live listeners watch the newest 5 of friends, requests and inbox instead of all of them, and the request and inbox lists stop at 50. The sticker picker, collections and the journal's pictures still read every sticker, as they need them all. **Not done:** storing a nickname and avatar on each friend document (a copy that would go stale when a friend changes them; the list still reads one profile per friend, but only on the Friends page).

- **PM-v1.7.6-005: one name, "Journal together" (一起做手账).** The top bar, phone menu, page title, back link ("Back to Journal together") and the invitation badge ("Journal together: 1 invitation waiting") use the one name, and the page's button is "Start a page" (发起一页). The Make menu lists only Sticker, Tape and Journal: the second entry for the same page is gone (the Start a page dialog opens from its own page, or `/together?make=1`).

- **PM-v1.7.6-006: the sentences people misread, rewritten (en and zh).** The saved-sticker note no longer says "The name is fixed" (it says where to find it, how to change the edge and that it can be renamed in the Library; the name hint disappears once saved, and the note is whole at 360 and 375 px). The email note reads "Confirm your email. Optional for now; it lets you reset your password later.", and its small form is itself a button, "Email not confirmed · Resend". Sign-up step 2 asks "What should we call you?" with an empty nickname field (it used to be filled from the email address, which friends would then see) and says "Starting…" at once. The tape toast offers "See in Tapes" only away from the Tapes page, and the edge toast is the one sentence ("“Name” has its new edge."). The journal's status says "Saving…" from the first edit and then "Saved", and "Not saved yet" only when saving takes more than about 10 s or failed; Save shows only while something waits. "Download PNG" is "Download image" (下载图片), the account data text lost its two filler sentences, the Tapes lead is shorter, and a failed login says 登录失败 / "Couldn't log in".

- **PM-v1.7.6-007: sticker save.** The step 2 preview (and every `Sticker`) keeps its shape in a box narrower than itself: its height now follows its width (`aspect-ratio`) instead of a fixed height, which had drawn a round sticker as an oval on phones and tablets. Pressing Save twice quickly makes one sticker (a guard set on the first press, cleared only if the save fails or a new sticker starts). The edge slider is disabled once saved, the dialog scrolls to the "Saved" note only if it is not already in view (it used to jump to the top), the name field has the placeholder "Name it (optional)" / 取个名字（可不填）, and an unnamed sticker is called "Cut Oct 6, 14:32" (date and time).

- **PM-v1.7.6-008: one word per idea (en and zh).** Chinese: the library is 素材库 everywhere (no 资料库 / 胶带库), friends are 好友 (no 朋友), copy is 复制, duplicate 再做一份 (no 拷贝), a count is 已选 3 个, layers are 移到最上层 / 移到最下层, names are 名字, and the journal's lines are 底纹. English: the collections button is "Select" (was "Manage"), counts say "3 selected", the cutter's modes are Keep / Remove (留下 / 去掉), the colour groups are Base colour / Pattern colour / Pattern, the journal setup says "Paper type" and "Lines", and an edge's width is Thin / Medium / Thick (细 / 中 / 粗) instead of pixels (the tape length and width sliders lost their "px" too). Every Chinese sentence now uses full-width punctuation (，？！：；（）), and a test fails on ASCII punctuation next to Chinese and on the retired words. A new journal text starts in the Chinese handwriting font (文楷) when the interface is Chinese. Side effects fixed on the way: the colour swatches' tap area is 4 px in from the dialog's edge (a wider label had pushed the first swatch's tap area under the edge), and the two colour pickers sit one above the other on a narrow screen, so each shows a row of swatches instead of one or two columns.

- **PM-v1.7.6-009: a real front door and a home that is yours.**
  - **Signed out, `/` is a landing page** (it used to jump to the log-in form): "Turn your photos into stickers." with the photo → cut → journal page demo at every width, one brick "Make your first sticker" button and a line saying what sign-up needs, four things you can make, "send it anywhere" (the Chinese names 微信 and 小红书), a privacy line, "Free to use." (免费使用。) and a closing button. `/login` keeps its form and gains one sentence about the product ("New to Zoofus?"; hidden on short screens so the form stays in view). The top bar's "Sign up" is no longer a brick button.
  - **Signed in, `/` shows who you are today** (`features/home/`): the greeting by time of day with your nickname (morning, afternoon, evening, "Still up"); a new account gets one big "Upload a photo", the demo and "Four things to try" (each marked Start here / Done) with an idea of the day; a returning one gets "Pick up where you left off" (the journal edited last, with Continue), Recently cut, Latest journals and tapes and a "Try next" strip for the first feature not used yet; anything waiting (friend requests, shared things, Together invitations) shows as a card with one button each (Accept and Join work in place); after 14 days away the greeting changes ("Long time no see") and a refresher is offered. Reads are bounded (12 stickers, 3 journals, 3 tapes, one count each for friends and collections; what is waiting is already loaded for the top bar). The page title is now "Home".

- **PM-v1.7.6-010: the journal editor on a phone shows the page first.** Under 500 px the top bar is one row (back, title, status, Save) with Undo, Redo, zoom, Paper and Download image behind a "More" button, the six tools are a bar along the bottom of the screen (icon above the word, all six at once), the confirm-email note stays out of the editor, and what is chosen or typed (the text panel) is a sheet above the tool bar, so creating a text box no longer scrolls the page away. At 375x667 and 390x844 more than half of the screen is page. On tablets (500 to 1099 px) the panel sits beside the page. A tape picked from the list lands on top of everything, selected, with the note "Tape added" (胶带已贴上). The studio takes a new `more` prop (`header` is now just the status and Save); Together keeps "Save a copy" behind More on a phone.

- **PM-v1.7.6-012: lists that never look lost.** A journal tile with no page picture yet (the page you have just left, or one saved before pictures were kept) now draws the page from its items, read-only, instead of showing bare paper (`JournalLivePage`, loaded only when a tile needs it, for the first 6 tiles of a list). The "Loading your …" note adds "Still working. This is taking longer than usual." after 3 s. New journal's Start says "Starting…" at once, and Save edge ignores a second press from the first (the drawing step used to come before the button changed). Lists already showed skeletons and a status after 300 ms.

- **PM-v1.7.6-011: choosing several things and copying them, without a keyboard.** With the Move tool, a "Select several" (多选) button at the corner of the page makes every tap add a thing to the choice or take it out (a finger or a mouse; the handles step aside meanwhile). Copy is in the panel of one thing as well as of a group, and a Paste (粘贴) button shows up after a Copy, in those panels and beside "Select several". Duplicate and Paste put the copies 16 units aside (a little further each time) and choose them, so the count matches. The Ctrl/Cmd sentence is hidden on touch screens, and a press anywhere in the work area, the margin round the page too, puts Ctrl+A, copy, paste and Delete on the page.

- **PM-v1.7.6-016: the emulator build can open in Chinese.** `VITE_DEFAULT_LANG=zh-CN npm run dev:emulated` (or `build:e2e`) starts the emulated app in Chinese, as production does; without the variable it stays English, so the tests are unchanged (`docs/debugging.md`).

- **PM-v1.7.6-015 (part): less polling.** Friends, requests, shares and the workspaces list are refreshed by their live listeners the moment something changes, so the background poll is now a five-minute safety net (it was 60 s and 30 s; it already pauses while the tab is hidden). Not done: one counter document for the badge and moving the Together page picture out of the workspace document (both need rules and write-path changes).

## v1.7.6 – 2026-10-06

No rules change in this release.

### Fixes

- **The "Keyboard shortcuts" note in the sticker maker no longer opens by itself.** It used to open when the photo took focus (a moment after the dialog opened, and again after every click or stroke on the photo once closed), which moved the layout under someone already circling the photo. It now stays closed until the person opens it, and stays as they leave it. Screen readers still get the same text (always in the page, `#maker-keys`), and a keyboard user sees the "Keyboard shortcuts" line to open.

## v1.7.5 – 2026-10-06

No rules change in this release.

### Features

- **Journals: choose several things at once.** In the Move tool, drag an area on the page: everything at least half inside it is chosen (pen lines too), shown by one dashed box. Drag inside the box to move them all together, drag the round handle above it to turn them together (Shift snaps to 15°), arrow keys nudge them, Delete removes them, Ctrl/Cmd+A chooses everything. A group moves and turns as one undo step. Pen lines carry their points, so moving a group rewrites those points (`groupOps.ts`); the stored items and rules are unchanged.
- **Journals: copy, cut and paste by keyboard.** Ctrl/Cmd+C, X and V (and Ctrl/Cmd+D for a quick copy) work on one thing or a group. Each paste lands 28 units further down and right, on top, and is chosen. The clipboard lives in the open journal only (a sticker pointer means something only inside its own journal). Works in Together pages too.
- **Pencil, marker and crayon look like their real tools.** The pen stays a crisp line. A pencil is soft graphite with threads of darker lead; a marker is one even translucent coat that pools darker at its edges and does not double where it crosses itself; a crayon is waxy with the paper showing through. Each is painted into a small canvas per stroke (`penTexture.ts`) with a grain fixed to the page (the same paper tooth under every stroke, no shimmer while drawing), kept sharp at 2× for small strokes and lighter for big ones. Stored strokes are unchanged, so old journals show the new look.

### Fixes

- **Pixel prints can be turned again.** The Turn slider was hidden for the pixel kind; it is back in the sticker edge and tape editors. The small print swatch next to the pixel grid now gets a new pattern id and a new `<svg>` for every change, so a browser that kept drawing the old print (same id) shows the new size and angle.

## v1.7.4 – 2026-10-06

Follow-up to v1.7.3 after more use in production. **The Firestore rules change: they go out first with the release.**

### Fixes

- **A journal's picture in collections and lists.** A journal whose page picture was never made showed only its paper. Now such a journal is drawn once, out of sight (`features/journal/ThumbHealer.tsx`: up to 12 per visit, 3 on a slow computer, never the one being edited) and the picture is stored, so every list, collection and share shows the page. Backend: a new rule `pictureOnly()` lets the owner update only `thumbUrl` / `thumbPath` of a journal without changing its `updatedAt`, so lists do not reorder (rules test added).
- **Dialogs and sliders lag on one older Mac (Chrome 150 on macOS 12).** Not reproducible on a fast machine, so these are the likely causes, addressed together:
  - **the edge of a sticker was grown by thousands of full-size draws** (`dieCut`: up to 4,320 `drawImage` calls for a torn edge, hundreds for the others, every time anything changed), which is what made the sticker, tape-edge and "Edit edge" screens lag and the lag pile up on a computer whose graphics cannot keep up. Now: the grown edge is kept while only the colour or print changes (a recolour is two draws, about 60× less), a torn edge uses stamps about a pixel apart (200 to 720, scaled with its width) instead of always 720, temporary canvases are released at once instead of waiting to be collected, and the preview keeps its resized cut-out between changes (`dieCut` option `cacheMasks`, `forgetMasks`);
  - paper grain was an SVG noise filter drawn behind every piece; it is now a 63 KB PNG (`public/grain.png`);
  - the sticker preview queued a full redraw for every slider tick and finished them all; it now draws only the newest request, and at 1× pixels in lite mode;
  - `mix-blend-mode` is gone from tapes (faces lost theirs in v1.7.3), and the 8-shadow focus ring is no longer put on big cards, the masthead or dialogs;
  - **lite drawing** (`src/lib/lite.ts`, class `zf-lite` on `<html>`): no grain, no fades, a plain focus ring, big torn clips as rectangles, 1× pictures. It turns on with `?lite=1`, on two cores or fewer, or when the page keeps dropping frames, and is remembered (`?lite=0` turns it off).
- `/diagnostics` now reports the screen and pixel ratio, cores and memory, the graphics chip and whether drawing is full or lite, for reports about slowness.

### Other

- `docs/debugging.md` §3c (a slow computer) and `docs/data-model.md` (page pictures, server times, what is kept in the browser) describe all of the above.

## v1.7.3 – 2026-10-05

Fixes from using v1.7.2 in production, plus the interface now starts in Chinese.

### Fixes

- **Shared journals show their page.** A journal shared before its page picture was made used to reach a friend as bare paper until its owner edited and saved again. The picture is now made a few seconds after the last edit, and a share without one is drawn from what was sent.
- **No more "This page isn't here" flash in Together** when you press Save. The page was being read as missing for a moment after the save. The same fix covers stickers, tapes, collections and shared items.
- **The tape width slider on a journal page is gone** (it did nothing there); the length slider stays.
- **The top bar stays at the top** on every screen size (except short, landscape ones), and the page no longer bounces at its ends, so the edge of the background pattern does not show.
- **Opening a dialog is lighter:** it fades in over 120 ms instead of moving and bouncing for 320 ms, paper faces no longer use a blend mode, and the whole dialog no longer gets a focus outline while something inside it has focus.

### Features

- **The interface starts in Chinese** until someone picks a language; the choice is remembered, and the browser's own language is no longer consulted. Anyone who already chose English keeps it.
- The Chinese text was reviewed: the tape page lead, the collections help (it named a button "选择" that is called "管理"), the half-sentence heading on sign-up step 2, the data download wording, starter tape names and stray punctuation.

### Other

- New checks: a shared journal's preview, the tape control, the Together save flash (it fails on the old code), the pinned top bar. The design-system checks now set the language the way a person does.
- The end-to-end tests in CI now run on six runners at once (about 8 minutes instead of 23), with the browser and emulator downloads cached.
- No rules change in this release.

## v1.7.2 – 2026-10-05

Third release from the project-manager review (this one covers its v1.7.1 plan, 15 tasks). It fixes two regressions from v1.7.1 that the tests could not see.

### Fixes

- **Google sign-in with a profile photo** no longer leaves you without a friend code and avatar: a Google photo link is not a link the app trusts, and it used to stop the whole public profile from being written. It is now left out, and the Friends page offers "Try again" if the code does not load.
- **Together "Save a copy"** no longer drops shelf stickers while saying it worked: the enforcing Content-Security-Policy blocks `fetch` of `data:` pictures, which are now read directly. If a picture still cannot be copied, the note says how many.
- The sticker preview opens whole (at the top, never wider than its box) on small phones and at 200% zoom; after saving, the sticker's options are locked so a second press cannot make a duplicate, and "Edit edge" is a proper button there and in the Library.
- One wrong-password message instead of two; Enter submits the nickname dialog; edge prints start with an ink that shows against the paper (with a hint when it does not); "Edge saved." waits until the tile shows the new edge.
- A journal read straight after saving is no longer skipped from the list.

### Features

- A single save status ("All changes saved" / "Saving…") in the journal editor and in Together, replacing the red Save and the second "Saved"; titles autosave.
- The journal editor's controls are single scrolling rows on short and narrow screens so the page is in the first screen; the active tool is underlined as well as coloured.
- The cutter's keyboard help is a "Keyboard shortcuts" disclosure (hidden on touch screens, still read by screen readers).
- The confirm-email note says once that it is optional, then shrinks to an icon.
- Notes (toasts) stay 8-10 seconds, have a close button and close with Esc; the tape note offers "See in Tapes". Lists show a skeleton and "Loading your …" on slow connections.
- Focus: dialogs start on their first field and return to the Make button when opened from the Make menu; the login heading has focus after logging out. Chinese: finished heading, one verb for making a sticker, colour names, a title for each sign-up step, decorative pictures no longer announced.

### Other

- The share, Together and Google sign-in flows now also run under the enforcing policy in the end-to-end tests (a violation fails the test), with a Google sign-in test using the Auth Emulator. `RELEASE_CHECKLIST.md` asks for a console walk after deploy, including the real Google popup.
- No rules change in this release.

## v1.7.1 – 2026-10-05

Second release from the project-manager review of v1.7.0 (all 14 of its tasks).

### Features

- The sticker cutter works without a mouse: Enter gives a starting selection (60% of the photo), arrows move it, Shift plus arrows resize it, Enter again cuts it out, and a live region says what is selected, in English and Chinese. "Use the whole photo" selects everything in one press. (Shift plus arrows used to mean a bigger move; Alt does that now.)
- The journal editor has a heading and a readable list of what is on the page; shared pictures say who they are from; the toast names the tape you added; focus returns to what opened a dialog (and moves to "See it in Library" after saving a sticker).
- A failed login keeps your email and puts the cursor in the password field. The verify-email note fits a phone ("Confirm your email"), and the first Tab on a fresh page reaches the skip link.
- The sticker save dialog fits a phone (the preview takes about 40% of the height and stays in view), "Save to Library" is the main button, and there is "Make another".
- One caption on a sticker card, starter tapes named in Chinese, and Chinese typed into a Latin handwriting font now loads its Chinese fallback.
- The phone Menu button shows when a request, share or invitation is waiting. Sharing shows progress at once, cannot send twice, and says who it went to. Together tells you when only some invitations went out and lets you invite the rest; the page picture in the list fills its paper; a plain save status sits next to Save.
- Focused colour swatches now have a ring of their own.

### Fixes

- A friend can no longer make your browser request an outside address through a picture link: friend-written data is checked where it is read and shown, and the security rules refuse it where it is written (profile picture, share pictures, shelf entries, page thumbnails).
- Profile pictures must be PNG, JPEG or WebP (an SVG or HTML file could carry script). **The Firestore and Storage rules ship with this release.**
- The Content-Security-Policy is now enforcing (it was report-only). It is proven on a production build with the main flows and with negative controls. If something the app needs is blocked in production, the browser console says `Refused to ...`; `RELEASE_CHECKLIST.md` has the emergency switch back to report-only.

### Other

- Checks added: the cutter by keyboard alone, untrusted picture links, CSP on a production build, a focus ring on every control including Home and the Make dialogs, the phone save dialog, login failure, the verify note, dialog focus, captions, English/Chinese key parity.
- Developer: `npm run test:coverage`; the emulators listen on 127.0.0.1 only (`npm run emulators:lan` opens them to the network for a second device) (the login page deliberately keeps no meta description: the design system forbids a tagline, and its test enforces that); unit tests no longer depend on the emulator flag.

## v1.7.0 – 2026-10-05

First release from the project-manager review of v1.6.2 (all 14 of its tasks), plus dependency updates.

### Features

- Keyboard and screen readers: focus moves to the page heading after each navigation and back to whatever opened a dialog when it closes; the page change is announced; the skip link lands in the page; every control shows a focus ring (and the system ring in forced-colours mode). The New tape dialog takes 11 Tab presses to reach Add (was about 100): the pixel grid is one stop with arrow keys, the name field comes first, the preview stays in view on a phone and Add is pinned.
- Security headers on every page, a report-only Content-Security-Policy and a year-long cache for built assets (`firebase.json`).
- The app only follows picture links to its own Storage bucket or `data:` images, so a friend's share can no longer make your browser fetch an arbitrary address.
- Plain, small first-run screens: the log in / sign up form comes first at every width; the verify-email note is one line you can hide (and notices when you have confirmed); the nickname step is marked required and suggested from your email; after saving a sticker the dialog says it is in your Library and takes you there.
- The language choice lives in the account menu once you are signed in; the account button shows your name and the phone menu button says Menu (both 44 px tall). The Account page uses plain words ("Download my data (a file you can keep)") and says what is kept and who can see it.

### Fixes

- Workspaces can only invite your friends (one invitation per write), and a friend code can only be claimed by the person whose profile carries it. **The security rules ship with this release.**
- The top bar was 25 px too wide on the log in and sign up pages at 375 px; the account page scrolled sideways on phones with a long button label; the zoom button's name did not contain its visible "100%"; the phone menu clipped its last items.
- The Chinese fonts: the 7 MB LXGW WenKai file is now sliced by character range and the `.woff` fallbacks are dropped, so the build shrinks from 75 MB to 43 MB.

### Other

- New checks: CSP violations, a visible focus ring on every control (3:1 contrast), accessible names, form visibility at four widths, keyboard use of the tape dialog, the verify note, the language menu, the account page.
- Dependency updates: GitHub Actions (checkout 7, setup-java 6, setup-node 7) and minor/patch npm updates (React and others). TypeScript 7 and ESLint 10 were declined for now.
- Docs: README, CLAUDE.md, data model, debugging guide and the release checklist (promoting the CSP) are up to date.

## v1.6.2 – 2026-10-05

### Fixes

- The live site is rebuilt with the reCAPTCHA key that is registered in Firebase App Check (it was built with an older key, so App Check could never get a token).
- Reading pictures (sharing, editing a sticker's edge, saving a copy of a Together page) needs a CORS policy on the Storage bucket; `cors.json` and the steps to apply it are in the repo and in `docs/debugging.md`.

### Other

- `docs/debugging.md` covers the App Check key mismatch and the CORS error.

## v1.6.1 – 2026-10-05

### Fixes

- v1.6.0 could not be released: three unit tests imported a module that needs the Firebase keys, which CI does not have. v1.6.1 is v1.6.0 (project-manager-only diagnostics, safer sharing, debugging tools) with that fixed, and `npm run test:noenv` now runs the tests the way CI does.

## v1.6.0 – 2026-10-05

### Features

- A `/diagnostics` page for project managers (and nobody else): it checks App Check, Firestore and Storage, lists the recent errors with their codes and copies a report. Access is decided by a manager list in the security rules.
- Errors are recorded (and counted in Google Analytics as `app_error`), App Check token failures are logged, and `?debug=1` turns on Firestore's verbose log.
- `docs/debugging.md`: one page on how to debug production and the emulators.

### Fixes

- Sharing can no longer hang or trap its dialog: every step has a time limit, Cancel always works, and lists refresh in the background. Pictures shared through the local emulators now load on other devices.

### Other

- New security rule (`adminCheck`): **deploy it before releasing**.

## v1.5.0 – 2026-10-04

### Features

- New stickers keep their lasso outline as a few KB of text instead of a second picture: one stored file per sticker instead of two. "Edit edge" rebuilds the cut-out from the sticker itself. Older stickers keep working. Shared stickers carry the outline, so a sticker you receive can have its edge edited.
- When a friend keeps or puts away a share, the files you made for them are removed from your storage the next time you are in the app.

### Fixes

- Together costs less: edits to an object are written at most every quarter of a second (a drag was dozens of writes a second), and "I am here" is written once a minute while the tab is on screen instead of every 20 seconds.

### Other

- New security rules (`shareDone`, sticker `outline` and `cut`): **deploy them before releasing**.
- Docs: data model and architecture notes updated.

## v1.4.0 – 2026-10-04

### Features

- Together: **Save** is now the main button (with a "Saved" state and a note on when it last happened); Save a copy is the second one. Edits still reach everyone live; Save refreshes the page's picture in the list.
- The tools in the journal and Together studios sit two to a row.
- The pages in Collections use the same size and spacing as the sticker library (a collection's contents too, with stickers at the library size).

### Fixes

- Autosave no longer interrupts you: the picture is drawn from the layers into a separate canvas (the selection handles used to be hidden for a moment, which looked like a refresh), changes that only echo your own edit are ignored, and autosave runs at most once a minute (it was every four seconds in journals).
- The small pixel preview in the tape studio now follows the pixel size you choose, as well as the turn.

## v1.3.0 – 2026-10-04

### Features

- Stickers can be named when you save them (the date is only the default).
- Tapes in the library get the same hover actions as stickers (Share, Rename, Delete) and can now be edited afterwards: change the print, size, ends and name in place.
- Names sit above the picture on stickers, tapes, journals, collections and Together pages.
- Together: the list and the copy you save now show the page as it looks (a small picture kept up to date as people edit), not just the paper.
- The Together "bring in" window is now "Add to this page": one card per sticker or tape with its tick and name together, a clear "Add 3" button, and a shorter "Add from my library" button that matches the others.
- The circle round the chosen language is a smoother, rounder, pencil-like loop.

### Fixes

- The torn sticker edge could grow thin spikes; the edge is now smooth noise with eased bites, and a test keeps it that way.
- Tape tiles' hover actions did not appear; they do now.

### Other

- New security rules (tapes can be edited; a Together page can carry a thumbnail): **deploy them before releasing**.
- The release process in `CLAUDE.md` now says that "release" is standing permission for the whole process, and that the README and other docs are brought up to date before every release.

## v1.2.0 – 2026-10-04

### Features

- Tapes behave like stickers in the library: the same hover lift, and Share and Rename on hover.
- A collection's folder shows everything in it when you point at it: stickers, tapes and journals.
- A journal's picture in the list is refreshed every time the page is saved (also by autosave).
- Layers in the journal studio (and in Together) can be moved one step forward or backward, not only to the very front or back.
- Together: the "here now" list shows only faces, with the name (the one you gave your friend) on hover; no more Leave button inside a page.
- The chosen language on the bar is circled by hand instead of underlined.
- Sharing shows what is being shared.

### Fixes

- Sharing a sticker, editing its edge and saving a copy of a shared page could fail on the live site when the browser had already cached the picture from a plain image. Pictures are now read around that (cache skipped, then through Storage), a failure says why in a short code, and error notes disappear on their own after a few seconds.
- Editing a sticker's edge no longer stops over older values in parts of the sticker that are not being changed (the rules check only what changes).
- "Shared with you" counts what is waiting, and what you keep leaves the list.
- The red dot for Together invitations was drawn in the wrong colour; fixed.

### Other

- Stickers in the library are larger and closer together; the tape studio loses its preset angle buttons (turn the tape by hand); "Make" has no plus; collection names are no longer suggested.
- New security rules (sticker updates check only what changes): **deploy them before releasing**.

## v1.1.0 – 2026-10-04

### Features

- Journal studio: the eraser now rubs out only the part of a line it passes over, not whole lines. Stickers and tapes can be stretched freely (any handle, any direction; "Undo stretching" restores the shape). Clicking where objects overlap picks the one you pointed at (see-through corners of a sticker are ignored), and clicking the chosen one again picks the next one underneath.
- Fonts are a drop-down, grouped, with each font shown in its own style: many more Chinese handwriting fonts (刘建毛草, 志莽行书, 站酷小薇, 站酷庆科黄油 and more) and more handwritten English fonts. Page size and paper pattern are drop-downs too.
- Newspaper and magazine paper are textures only (newsprint, aged newsprint, glossy, matte): no columns, headlines or boxes.
- Share straight from a tile: hover a sticker, tape or journal and use Share. Something a friend shares can be kept only once; afterwards it shows "Added to yours".
- Collections look like a folder with their stickers lying in it; point at one and they spring out.
- Library pages: the tabs sit above the title, the title is in the same place on every tab and carries one small sticker beside it; stickers are larger and closer together; no more tape on some stickers; "Select" is now "Manage".
- Friends: requests, accepted friends, shares and invitations appear live, without refreshing the page.
- Friends' pictures show for everyone: a small copy is kept in the public profile.
- Together: stickers a friend brings are visible to everyone (stored inside the shelf entry, no extra Storage); you choose which of your stickers and tapes to bring; Together gets a red dot when an invitation is waiting.
- The Make menu opens its dialog over the page you are on instead of taking you to the library.

### Other

- New security rules for the above (stretch, kept shares, inline pictures, aged paper): **deploy them before releasing**.

## v1.0.1 – 2026-10-04

### Fixes

- Release pipeline: a unit test no longer needs Firebase settings, so the release build runs on CI. v1.0.0 (below) was tagged but its build stopped at that test and was never deployed; v1.0.1 is the first deployed 1.0 release.

## v1.0.0 – 2026-10-03

### Features

- Journals (手账): a page studio with custom size, paper (notebook, newspaper, magazine) and styles, stickers and tapes placed freely, text in common and handwriting fonts, drawing (pen, pencil, crayon, …), erase, undo/redo, PNG export; a journal gallery with thumbnails.
- Collections of your own for stickers, tapes and journals, with bulk select, add, remove and delete.
- Friends: a friend code, requests, nicknames only you see; share stickers, tapes and journals; a "Shared with you" inbox; keep what friends share.
- Together: make a journal page with friends in real time (invite, shared shelf of stickers and tapes, who is here, everyone can save a copy).
- Nickname at sign-up, a profile card (change the nickname, make a profile picture with the sticker maker or pick a sticker), the picture keeps its sticker shape in the navigation bar.
- New navigation: one "Make" menu for stickers, tapes, journals and together; a "Library" with tabs; the language switch sits on the bar.
- Tapes live on their own page with a "New tape" dialog; stickers and tapes are separate tabs.

### Fixes

- Torn edges of small pieces (profile picture, paper and ink pickers) are calmer: no more long thorn-like spikes.
- Clicking a sticker under "Recently cut" opens a preview instead of the book.
- The Stickers/Tapes switch no longer disappears on narrow screens.
- "Edit edge" reports a specific error code when it fails and is more tolerant of leftovers from earlier saves.

### Other

- New security rules for journals, collections, friends, shares and shared pages (**deploy them before releasing**); account deletion removes the new data too; README rewritten.

## v0.4.1 – 2026-10-03

### Other

- The two timing checks (tear generation, torn die-cut) run on a developer machine only; CI runners are too slow and variable for them. No change to the app.

## v0.4.0 – 2026-10-03

The redesign and the Chinese interface.

### Features

- New look on the Zoofus design system (Tailwind v4 and Radix; the MUI interface is gone): torn-paper pieces, tape, typewriter type, on a notebook ground. Every screen is restyled for phone and desktop, in English and Chinese (中文).
- Sticker edge studio: choose the edge (smooth, wobbly or torn), its width and a print (stripes, dots, gingham, check, wave, pixels, doodle, or a plain colour) from 16 colours. "Edit edge" on any new sticker in the book redoes it. The downloaded PNG now matches the on-screen preview at any size.
- Tape studio at /tape: turn, size and print a tape and keep it on "My tape roll"; the four starter tapes stay on the roll.
- Shapes are drawn by dragging on the photo; there is no "Add shape" button. Space adds one from the keyboard.
- A freehand selection that leaves the photo and comes back elsewhere includes the corner it goes round.
- Paint pixels by dragging across the grid.
- A language switch (EN · 中文) in the account menu, and a "Continue with Google" button that follows Google's branding.
- Dialogs never grow past the screen: the title and the buttons stay in view and only the middle scrolls, with no second scrollbar behind.

### Fixes

- The sticker book could say "We couldn't load your stickers" for stickers saved with a print by a development build. Saved data is now read leniently: one unreadable sticker or tape can no longer hide the rest.
- No layout shift while stickers load; buttons and fields are at least 44 px to tap on a phone.
- Deleting a sticker removes both its stored images.

### Other

- Faster start: the sticker maker (113 KB), the Chinese fonts and Analytics are loaded only when needed. Lighthouse (mobile, signed in): Performance 96–99, Accessibility 100.
- Security rules now bound user-designed prints (colours, sizes, strokes) and PNG uploads (10 MB). They were deployed before this release.
- Tests: 255 unit, 37 security-rules and 48 end-to-end tests, including accessibility, contrast, torn-edge, Chinese-font, reduced-motion, touch-target, dialog-scroll and screen-versus-file checks.

## v0.3.1 – 2026-10-03

Image handling and the sticker gallery.

### Features

- Click a sticker in My Stickers to preview it full size in a pop-up: zoom with the buttons, mouse wheel, double click or pinch, drag to move around, Escape to close. Transparent areas show on a checkerboard.
- Saved stickers are compressed: scaled to at most 1,280 px and stored as WebP (quality 82, stepping down to 60 if needed, 400 KB target), so each sticker is typically under 100 KB. The My Stickers grid shows this full-size image (lazy-loaded) instead of a tiny thumbnail, so stickers look sharp; old thumbnails are no longer used. "Download PNG" is still full quality.
- Profile photos are scaled to 512 px and compressed to JPEG before upload (they used to keep their full dimensions).

### Other

- Storage rules now accept WebP or PNG stickers up to 2 MB and profile photos up to 2 MB (was 10 MB and 5 MB), deployed right after this release.
- Uploads need the Firebase Blaze plan (Cloud Storage no longer works on the free Spark plan); documented in `docs/security-setup.md`.
- Saving logs the real error in the browser console.

## v0.3.0 – 2026-10-03

Architecture rewrite and app foundations. The visual redesign moves to v0.4.0.

### Features

- Sticker book: save a cut-out to your account, with a thumbnail, then list, rename and delete it on the new My Stickers page.
- Real undo and redo in the sticker editor (the old "Redo" only reset everything), plus Clear.
- Editor keyboard shortcuts (arrows move the selection, Delete removes it, Ctrl/Cmd+Z undoes) and touch handling for drawing.
- Account page: download all your data as JSON, delete your account and everything in it.
- Email verification: new password accounts get a verification email and a reminder banner.
- Photos are rotated by their EXIF orientation, large photos are downscaled for editing, and unsupported files get a clear message.
- Error screen and a 404 page.

### Security

- Firestore and Storage rules are owner-only with validated fields, size and type limits. Deployed to production, with emulator tests.
- Firebase App Check is wired in (needs the one-time console setup and a site key; off until then).
- Limits: 200 stickers per account, 9.5 MB per sticker. Sign-up requires 8-character passwords.
- Branch protection on `dev` and `main`; Dependabot enabled.

### Fixes

- The cut-out canvas was rebuilt endlessly because its size object changed every render.
- Account and sticker deletion no longer fail when a file is already gone; failed saves clean up their uploads.
- The error screen clears when you navigate; cached data is cleared on sign-out.
- The first uploaded image no longer fails to load.

### Other

- Migrated to TypeScript (strict) with ESLint, Prettier and a feature-based structure (`@/` alias).
- Redux replaced by TanStack Query (server data) and Zustand (editor state); forms use react-hook-form and zod; environment variables are validated at startup.
- The sticker editor is rebuilt around a unified selection model with a pure, tested mask engine.
- Data model for collage and journal pages (schema, operations, API, rules; no UI yet).
- Local Firebase emulators (`npm run emulators`, `npm run dev:emulated`) and documented environments.
- Tests: 94 unit and component tests, 21 security-rule tests and an end-to-end flow on the emulators, all in CI.
- Docs: UI style brief, App Check and security setup guides.

## v0.2.0 – 2026-10-02

### Features

- Download the masked cut-out as a PNG from the Image Lasso confirm view.

### Fixes

- Profile setup now awaits the upload and surfaces errors instead of navigating early and swallowing failures.
- Firebase Analytics is only initialized in supported browsers.
- Cleared all `npm audit` findings (17 -> 0); pinned rollup 4.59.0 (4.64.0 hangs the build).

### Other

- Tag-triggered release workflow (test, build, Firebase live deploy, GitHub Release); PR previews now run tests and build with Node 22.
- Vitest + Testing Library setup with first tests; CI workflow (test + build) on pushes and PRs.
- Lazy-loaded the Image Lasso panel and split vendor chunks (main bundle 1.5 MB -> 244 kB).
- Removed Create React App leftovers (`App.css`, `logo.svg`, `reportWebVitals`, `manifest.json`, unused config).
- Added a contributor-facing README, `CLAUDE.md` project guide, and a `@claude` GitHub Actions workflow (`.github/workflows/claude.yml`).

## v0.1.0 – 2025-10-20

First release: authentication, user profiles and the Image Lasso tool.

### Features

- Email/password and Google sign-in, password reset, protected routes, responsive auth pages and top nav bar.
- Two-step sign-up with nickname and compressed profile picture (Firebase Storage + Firestore); avatar shown in the nav bar.
- Redux Toolkit store for the user profile.
- Image Lasso: upload an image, draw freehand lasso selections (mouse and touch, multiple paths, auto-closing), add rectangle/triangle/star shapes, switch between select and deselect modes, delete shapes, undo the last action, and reset.
- Masked cut-out preview with adjustable border color and width (0–100), including borders on clipped edges.

### Fixes

- Firebase Hosting rewrite for client-side routing.
- Default profile picture; promise handling fix.

### Other

- Refactored ImageLasso into hooks and a shared context; styling and layout updates.
- Firebase Hosting preview workflow for pull requests.
