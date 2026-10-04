import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { createJournal } from "@/features/journal/journal.api";
import type { Asset, Item, Journal } from "@/features/journal/journal.schema";
import { saveSticker } from "@/features/stickers/library/stickers.api";
import type { Sticker } from "@/features/stickers/library/sticker.schema";
import { saveTape } from "@/features/tape/tape.api";
import type { Tape } from "@/features/tape/tape.schema";
import { db, storage } from "@/lib/firebase";
import { deleteFileIfExists, readPicture, withTimeout } from "@/lib/storage";
import {
  journalPayloadSchema,
  stickerPayloadSchema,
  tapePayloadSchema,
  type Share,
} from "./social.schema";

/** What can be handed to a friend. */
export type ShareSource =
  | { kind: "sticker"; sticker: Sticker }
  | { kind: "tape"; tape: Tape }
  | { kind: "journal"; journal: Journal; stickers: Map<string, Sticker> };

const inbox = (uid: string, id: string) => doc(db, "users", uid, "inbox", id);
const sent = (uid: string, id: string) => doc(db, "users", uid, "sent", id);

async function fetchPicture(url: string): Promise<Blob> {
  const blob = await readPicture(url);
  return blob.type === "image/png" || blob.type === "image/webp"
    ? blob
    : new Blob([blob], { type: "image/webp" });
}

async function putPicture(path: string, blob: Blob): Promise<string> {
  const r = ref(storage, path);
  await withTimeout(uploadBytes(r, blob, { contentType: blob.type }), 45_000, "upload");
  return withTimeout(getDownloadURL(r), 20_000, "link");
}

const extOf = (b: Blob) => (b.type === "image/png" ? "png" : "webp");

/**
 * Hand something to a friend. Pictures are copied into a folder of mine for this share, so what
 * they see (and keep) does not change when I edit or delete my own sticker. The friend gets a
 * document in their inbox; I keep a record to take it back.
 */
export async function shareWith(
  me: string,
  friend: string,
  source: ShareSource,
  note?: string,
): Promise<string> {
  const sid = crypto.randomUUID();
  const dir = `${me}/shares/${sid}`;
  const files: string[] = [];
  let name: string;
  let payload: Record<string, unknown>;

  try {
    if (source.kind === "sticker") {
      const s = source.sticker;
      const img = await fetchPicture(s.imageUrl);
      const imgPath = `${dir}/img.${extOf(img)}`;
      const imageUrl = await putPicture(imgPath, img);
      files.push(imgPath);
      let sourceUrl: string | undefined;
      if (s.sourceUrl) {
        const src = await fetchPicture(s.sourceUrl);
        const srcPath = `${dir}/src.${extOf(src)}`;
        sourceUrl = await putPicture(srcPath, src);
        files.push(srcPath);
      }
      name = s.name;
      payload = {
        name: s.name,
        imageUrl,
        ...(sourceUrl ? { sourceUrl } : {}),
        ...(s.outline && s.cut ? { outline: s.outline, cut: s.cut } : {}),
        width: s.width,
        height: s.height,
        ...(s.edge ? { edge: s.edge } : {}),
        ...(s.seed ? { seed: s.seed } : {}),
      };
    } else if (source.kind === "tape") {
      const t = source.tape;
      name = t.name;
      payload = {
        name: t.name,
        pattern: t.pattern,
        thickness: t.thickness,
        opacity: t.opacity,
        ends: t.ends,
      };
    } else {
      const j = source.journal;
      name = j.title;
      const assets: Record<string, Asset> = {};
      const idOf = new Map<string, string>(); // old ref -> new asset id
      const items: Item[] = [];
      let n = 0;
      for (const item of j.items) {
        if (item.t !== "s") {
          items.push(item);
          continue;
        }
        let aid = idOf.get(item.ref);
        if (!aid) {
          // a picture on the page: one of my stickers (by id) or one kept inside the journal
          const info: { url: string; w: number; h: number; name: string } | null =
            item.ref.startsWith("a:")
              ? (j.assets?.[item.ref.slice(2)] ?? null)
              : (() => {
                  const st = source.stickers.get(item.ref);
                  return st
                    ? { url: st.imageUrl, w: st.width, h: st.height, name: st.name }
                    : null;
                })();
          if (!info) continue; // its sticker is gone: leave it off the shared page
          const pic = await fetchPicture(info.url);
          aid = `p${n++}`;
          const path = `${dir}/${aid}.${extOf(pic)}`;
          const url = await putPicture(path, pic);
          files.push(path);
          assets[aid] = { url, path, w: info.w, h: info.h, name: info.name };
          idOf.set(item.ref, aid);
        }
        items.push({ ...item, ref: `a:${aid}` });
      }
      let thumbUrl: string | undefined;
      if (j.thumbUrl) {
        const th = await fetchPicture(j.thumbUrl);
        const thPath = `${dir}/thumb.${extOf(th)}`;
        thumbUrl = await putPicture(thPath, th);
        files.push(thPath);
      }
      payload = {
        title: j.title,
        page: j.page,
        items,
        assets,
        ...(thumbUrl ? { thumbUrl } : {}),
      };
    }

    const batch = writeBatch(db);
    batch.set(inbox(friend, sid), {
      from: me,
      kind: source.kind,
      name: name.slice(0, 80),
      ...(note?.trim() ? { note: note.trim().slice(0, 200) } : {}),
      payload,
      files,
      seen: false,
      createdAt: serverTimestamp(),
    });
    batch.set(sent(me, sid), {
      to: friend,
      kind: source.kind,
      name: name.slice(0, 80),
      files,
      createdAt: serverTimestamp(),
    });
    await withTimeout(batch.commit(), 30_000, "send");
    return sid;
  } catch (err) {
    // a send that merely timed out may still arrive later: its files must stay
    if ((err as { code?: string }).code !== "timeout/send")
      await Promise.allSettled(files.map((p) => deleteObject(ref(storage, p))));
    throw err;
  }
}

/** Take a share back: it leaves their inbox, and the copies of my pictures are removed. */
export async function unshare(
  me: string,
  friend: string,
  sid: string,
  files: string[],
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(inbox(friend, sid));
  batch.delete(sent(me, sid));
  await batch.commit();
  await Promise.allSettled(files.map((p) => deleteFileIfExists(ref(storage, p))));
}

/** Keep what a friend shared: it becomes my own sticker, tape or journal (pictures are copied to my folder). */
export async function saveSharedToMine(
  me: string,
  share: Share,
  counts: { journals: number },
): Promise<string> {
  if (share.kind === "sticker") {
    const p = stickerPayloadSchema.parse(share.payload);
    const [sticker, source] = await Promise.all([
      fetchPicture(p.imageUrl),
      p.sourceUrl ? fetchPicture(p.sourceUrl) : Promise.resolve(undefined),
    ]);
    return saveSticker(me, {
      name: p.name,
      sticker,
      ...(source ? { source } : {}),
      ...(p.outline && p.cut ? { outline: p.outline, cut: p.cut } : {}),
      width: p.width,
      height: p.height,
      edge: p.edge ?? {
        shape: "wobbly",
        scale: 1,
        fill: { kind: "solid", bg: "sheet-50" },
      },
      seed: p.seed ?? crypto.randomUUID(),
    });
  }
  if (share.kind === "tape") {
    const p = tapePayloadSchema.parse(share.payload);
    return saveTape(me, p);
  }
  const p = journalPayloadSchema.parse(share.payload);
  const id = crypto.randomUUID();
  const assets: Record<string, Asset> = {};
  for (const [aid, a] of Object.entries(p.assets ?? {})) {
    const pic = await fetchPicture(a.url);
    const path = `${me}/journals/${id}/assets/${aid}.${extOf(pic)}`;
    assets[aid] = { ...a, url: await putPicture(path, pic), path };
  }
  return createJournal(
    me,
    {
      id,
      title: p.title,
      page: p.page,
      items: p.items,
      assets,
      origin: { from: share.from },
    },
    counts.journals,
  );
}
