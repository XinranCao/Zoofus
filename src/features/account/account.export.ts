import type { Page } from "@/features/pages/page.schema";
import type { Profile } from "@/features/profile/profile.schema";
import type { Sticker } from "@/features/stickers/library/sticker.schema";

export interface AccountExport {
  exportedAt: string;
  profile: Profile | null;
  stickers: Sticker[];
  pages: Page[];
}

/** The JSON a user downloads: everything we store about them (images are linked, not embedded). */
export function buildExport(
  data: { profile: Profile | null; stickers: Sticker[]; pages: Page[] },
  now = new Date(),
): AccountExport {
  return { exportedAt: now.toISOString(), ...data };
}
