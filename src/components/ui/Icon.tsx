import type { CSSProperties } from "react";

/** Hand-ish 24px line icons, 1.7 stroke, round caps, in currentColor. No icon font, no emoji. */
export const ICONS = {
  upload:
    "M12 16V5M7.5 9.5 12 5l4.5 4.5M5 15.5v3.2c0 .5.4.9.9.9h12.3c.5 0 .8-.4.8-.9v-3.3",
  download: "M12 4.5v11M7.5 11 12 15.5l4.5-4.5M5 19.2h14.2",
  undo: "M8.5 6.5 4.8 10l3.7 3.6M5.2 10H14c3 0 5 2 5 4.6S17 19 14 19h-3",
  redo: "M15.5 6.5 19.2 10l-3.7 3.6M18.8 10H10c-3 0-5 2-5 4.6S7 19 10 19h3",
  trash: "M5 7h14.2M9.5 7V5h5v2M7 7.2l.9 12h8.4l.8-12M10.3 10.5v5.6M13.8 10.5v5.6",
  reset: "M5 12a7 7 0 1 0 2.2-5.1M5 4.5v3.2h3.3",
  check: "M5 12.6l4.3 4.2L19.2 7",
  x: "M6.5 6.5l11 11M17.5 6.5l-11 11",
  menu: "M4.5 7.2h15M4.5 12.1h13.2M4.5 17h15.4",
  lasso:
    "M12 4.8c4.6 0 8 2.3 8 5.2s-3.4 5.1-8 5.1-8-2.2-8-5.1 3.5-5.2 8-5.2ZM8.6 14.6c-.9 1.6-.4 3.2 1.1 3.9M9.5 18.6l-1.2 1.8",
  turn: "M18.6 8.2A7 7 0 1 0 19 13.4M19.2 4.4v4.1h-4.1",
  tri: "M12 5.2 19.6 18.4H4.6Z",
  rect: "M5 6.4h14.2v11.4H4.8Z",
  star: "M12 4.5l2.3 4.8 5.2.6-3.9 3.6 1 5.2L12 16.2l-4.6 2.5 1-5.2-3.9-3.6 5.2-.6Z",
  plus: "M12 5.5v13M5.5 12h13",
  minus: "M5.5 12h13",
  alert: "M12 4.6 20.2 19H3.9ZM12 10v4.2M12 16.8v.3",
  pencil: "M15.2 5.3l3.4 3.4-9.9 9.9-4.1.7.7-4.1Z",
  user: "M12 12.4a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM5 19.6c.8-3.4 3.6-5 7-5s6.2 1.6 7 5",
  book: "M5 5.3c2.5-.6 5-.3 7 1.3v12.6c-2-1.5-4.5-1.9-7-1.3ZM19 5.3c-2.5-.6-5-.3-7 1.3v12.6c2-1.5 4.5-1.9 7-1.3Z",
  logout: "M10 5H5.2v14H10M14 8.5l3.6 3.5-3.6 3.5M17.4 12H9.5",
  gear: "M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6ZM12 3.8v2.4M12 17.8v2.4M3.8 12h2.4M17.8 12h2.4M6.2 6.2l1.7 1.7M16.1 16.1l1.7 1.7M6.2 17.8l1.7-1.7M16.1 7.9l1.7-1.7",
  globe:
    "M12 4.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6ZM4.4 12h15.2M12 4.2c2.3 2.2 3.4 4.8 3.4 7.8s-1.1 5.6-3.4 7.8C9.7 17.6 8.6 15 8.6 12s1.1-5.6 3.4-7.8Z",
  zoomIn:
    "M10.6 5.2a5.4 5.4 0 1 0 0 10.8 5.4 5.4 0 0 0 0-10.8ZM14.6 14.6l4.6 4.6M10.6 8v5.2M8 10.6h5.2",
  zoomOut:
    "M10.6 5.2a5.4 5.4 0 1 0 0 10.8 5.4 5.4 0 0 0 0-10.8ZM14.6 14.6l4.6 4.6M8 10.6h5.2",
  tape: "M4.6 8.2h14.8v7.6H4.6ZM8 8.2v7.6M16 8.2v7.6",
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  className = "",
  style,
}: {
  name: IconName;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={("zf-icon " + className).trim()}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={style}
    >
      <path d={ICONS[name]} />
    </svg>
  );
}
