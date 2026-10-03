The Masthead is the top band: wordmark, main navigation and the avatar menu. It holds no slogan and nothing else.

**Anatomy.** A full-width Paper (`peach-100`, `xl` tear on the bottom edge only with a wide lip, `flush`, measured). The row has padding 14 / 48 / 22 and holds the Wordmark, then the nav (`label` links, with the current one in `ink-deep` plus a Scribble underline), then the Avatar.

**Responsive.** Under 760px, padding becomes 12 / 16 / 18 and the wordmark 26px, and a menu button opens a torn `scrap` dropdown (Radix DropdownMenu) with the avatar, name, email, a divider and four items, the current one in `selected`.

**Signed out.** Shows a quiet "Log in" and a small primary "Sign up".

**Sticky.** Desktop only. Flat, with the torn edge and lip separating it from the content.
