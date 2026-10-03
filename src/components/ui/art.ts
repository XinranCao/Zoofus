/** Demo sticker art for the auth collage, hero cluster and empty states. Decorative only. */
export const ART = {
  pear: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><path d="M50 22c8 0 11 9 12 18 2 13 22 22 22 46 0 20-16 30-34 30S16 106 16 86c0-24 20-33 22-46 1-9 4-18 12-18Z" fill="#b4bc2f"/><path d="M38 60c-6 8-12 14-12 26" stroke="#dce35d" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M50 22c0-8 2-13 5-16" stroke="#6c4a3b" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M55 12c8-8 20-6 24-2-8 8-18 7-24 2Z" fill="#57620d"/></svg>`,
  cherry: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 110"><path d="M32 72c6-20 16-44 40-62M80 74c-2-24-4-46-8-64" stroke="#57620d" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M72 10c10 0 22 6 24 16-12 2-22-4-24-16Z" fill="#b4bc2f"/><circle cx="30" cy="80" r="21" fill="#c32768"/><circle cx="80" cy="82" r="20" fill="#da3b84"/><path d="M20 72c3-4 7-6 11-6M71 74c3-4 6-5 10-5" stroke="#f4ddea" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,
  cup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100"><path d="M18 30h70l-6 46c-1 10-9 16-19 16H43c-10 0-18-6-19-16Z" fill="#f1a17a"/><path d="M86 40c14-4 22 4 20 13-2 10-12 14-24 12" stroke="#e57c48" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M26 48h60" stroke="#ffe4c5" stroke-width="6"/><path d="M40 22c-4-6 4-10 0-16M56 22c-4-6 4-10 0-16" stroke="#6c4a3b" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55"/></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 110"><path d="M55 8l13 30 32 3-24 21 7 32-28-17-28 17 7-32L10 41l32-3Z" fill="#edcd7e"/><path d="M55 30l6 14 15 2" stroke="#ffe4c5" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,
  fish: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 80"><path d="M10 40c20-30 64-34 86 0-22 34-66 30-86 0Z" fill="#efb6d5"/><path d="M94 40l28-22-6 22 6 22Z" fill="#e374a7"/><circle cx="32" cy="36" r="4" fill="#7a0e4d"/><path d="M50 24c6 10 6 22 0 32M64 24c6 10 6 22 0 32" stroke="#f4ddea" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,
  leaf: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><path d="M50 8c30 20 36 60 6 96C20 80 18 36 50 8Z" fill="#57620d"/><path d="M52 112V30M52 52l14-12M52 70l-14-12M52 86l12-10" stroke="#dce35d" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>`,
} as const;

export type ArtName = keyof typeof ART;
export const ART_NAMES = Object.keys(ART) as ArtName[];

/** An art SVG as a data URL, ready for an <img> or drawImage. */
export const artUrl = (name: ArtName) =>
  "data:image/svg+xml;charset=utf-8," + encodeURIComponent(ART[name]);
