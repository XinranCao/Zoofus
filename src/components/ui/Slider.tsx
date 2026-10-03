import * as RSlider from "@radix-ui/react-slider";
import { useId, type CSSProperties } from "react";
import { scribblePath } from "@/paper/scribble";
import { tornVars } from "@/paper/torn";
import { useSeed } from "@/paper/useTorn";

/**
 * A single-value range drawn as a hand-drawn track with a torn mustard thumb. Radix Slider gives
 * the keyboard behaviour (arrows ±step, Page keys, Home/End); the thumb takes the traced focus ring.
 */
export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = "",
  format,
  onChange,
  seed,
  disabled,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  seed?: string;
  disabled?: boolean;
}) {
  const s = useSeed(seed);
  const labelId = useId();
  const pct = ((value - min) / (max - min)) * 100;
  const shown = format ? format(value) : value + unit;
  const track = scribblePath(s, { w: 200, h: 6 });
  return (
    <div className="zf-slider">
      <div className="zf-slider__top">
        <span id={labelId}>{label}</span>
        <output>{shown}</output>
      </div>
      <RSlider.Root
        className="zf-slider__root"
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(v) => onChange(v[0] ?? value)}
      >
        <svg
          className="zf-slider__art"
          viewBox="0 0 200 28"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d={track}
            transform="translate(0 11)"
            fill="none"
            stroke="var(--cocoa-800)"
            strokeOpacity={0.35}
            strokeWidth={2}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={track}
            transform="translate(0 11)"
            fill="none"
            stroke="var(--olive-500)"
            strokeWidth={5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={
              { clipPath: `inset(-10px ${100 - pct}% -10px -10px)` } as CSSProperties
            }
          />
        </svg>
        <RSlider.Track className="zf-slider__track" />
        <RSlider.Thumb
          className="zf-slider__thumb zf-torn"
          aria-labelledby={labelId}
          style={
            tornVars(s + "t", {
              size: "xs",
              w: 22,
              h: 26,
              amp: 1.6,
              res: 2,
            }) as CSSProperties
          }
        >
          <span className="zf-face" />
        </RSlider.Thumb>
      </RSlider.Root>
    </div>
  );
}
