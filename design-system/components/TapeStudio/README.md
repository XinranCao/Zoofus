TapeStudio is the full tape editor: turn, size, finish and print a tape, then save it to "My tape roll".

**Anatomy.** The left column is a notebook-ground stage with a sample scrap, the live tape and a round **turn handle** at the tape's end, with My tape roll below. The right column holds:
- **Direction**: chips −45 / −15 / 0 / +15 / +45 / +90, each with a tilted line glyph, plus the live angle in the label.
- **Length** (40–220), **Width** (12–36) and **See-through** (0–50%): sliders.
- **Ends**: Torn, Cut or Pinked.
- **Print**: a PatternEditor.
- A primary "Add to my tape roll".

**Interaction.** Drag the handle to any angle from −90 to 90°, or focus it and use the arrow keys ±5°. Tapping a saved tape loads all of its settings.

**Output.** A `TapeSpec { name, pattern, thickness, opacity, ends }`. Angle and length are stored per placement.

**Responsive.** Below 760px it becomes one column (stage, controls, roll) and the handle grows to 44px.
