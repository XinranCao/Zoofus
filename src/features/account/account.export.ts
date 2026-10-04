import type { Collection } from "@/features/collections/collection.schema";
import type { Journal } from "@/features/journal/journal.schema";
import type { Profile } from "@/features/profile/profile.schema";
import type { Sticker } from "@/features/stickers/library/sticker.schema";
import type { Tape } from "@/features/tape/tape.schema";

export interface AccountData {
  profile: Profile | null;
  stickers: Sticker[];
  tapes: Tape[];
  journals: Journal[];
  collections: Collection[];
}

export interface AccountExport extends AccountData {
  exportedAt: string;
}

/** The JSON a user downloads: everything we store about them (images are linked, not embedded). */
export function buildExport(data: AccountData, now = new Date()): AccountExport {
  return { exportedAt: now.toISOString(), ...data };
}
