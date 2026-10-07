Select is a drop-down for a choice with many options (fonts, paper, ruling). It is not a native `<select>`.

**Anatomy.** A torn button (`xs` tear, `sheet-50` face, Special Elite 14px) showing the current option and a small chevron. It opens a torn `scrap` list (a Radix DropdownMenu: arrow keys, typeahead, Esc) with the current option checked. Options may be set in their own style (a font option is shown in its own font) and may be grouped under small headings.

**States.** Default `sheet-50`; hover 0° and 1px up; open: the list lies flat under the button (no shadow); selected option shows a check as well as `selected` lime, never colour alone; focus is the traced ring; disabled is sage with 60% ink.

**Rules.** A few options that all fit on one line are a ToggleGroup; a long list is a Select. The list never grows past the screen and scrolls inside itself.
