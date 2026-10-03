Slider is a single-value range drawn as a hand-drawn track with a torn mustard thumb. It is used for sticker border width.

**Anatomy.** A top row with the label on the left and the `<output>` value on the right. The track is a 28px-tall SVG: a cocoa line at 35%, plus the filled part in `olive-500` 5px, clipped to the value. The thumb is a 22 × 26 torn `mustard-300` scrap at −3°.

**Behaviour.** Radix Slider (arrow keys ±1, Page ±4, Home/End). The thumb takes the traced focus ring. Value changes re-render the sticker live, throttled to the animation frame.
