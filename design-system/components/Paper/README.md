Paper is the base scrap: a flat piece torn from a magazine. The wrapper carries the rotation, the focus trace and the pale **fibre lip** (`::before`, clipped by `--fclip`). The face carries the tone, the grain and the torn clip (`--clip`). There is no shadow.

**Anatomy.** Wrapper `.zf-paper.zf-torn` (`--rot`, `--clip`, `--fclip`, `--fiber-tone`) holds optional tape, then the face `.zf-face` (`--tone`, grain `::after`).

**Props the consumer provides.** `seed` (a stable id), `size` (`xs`–`xl`), `tone` (a colour token, `scrap` by default), `rotate` (± range in degrees, `0` for none), `edges` (`'auto'` by default: all torn, about a third keep one cut edge; or `'trbl'` or any subset), `flush` (untorn edges sit on the box), `fiber={false}` (no lip), `fiberTone` (lip colour token, e.g. `cream-100` on sheet faces), `tape`, `measure` (fluid widths), `w`/`h` hints, and children.

**States.** Static. Interactive wrappers (Button, Chip, Avatar, Swatch) add hover (0°, −1px, face `brightness(.95)`), active (+1px, `.9`) and focus (`--focus-trace`).

**Do.** Pad content by amp + lip. Alternate tones between neighbours.

**Don't.** Never use `box-shadow`, `drop-shadow`, `border` or `border-radius`. Never reuse a seed for two visible elements.
