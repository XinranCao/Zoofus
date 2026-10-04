import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cleanForFirestore } from "@/paper/patternSchema";
import { MAX_TAPES, tapeDocSchema, type Tape, type TapeSpec } from "./tape.schema";

const tapesRef = (uid: string) => collection(db, "users", uid, "tapes");

export class TapeLimitError extends Error {}

export async function listTapes(uid: string): Promise<Tape[]> {
  const snap = await getDocs(query(tapesRef(uid), orderBy("createdAt", "desc")));
  const tapes: Tape[] = [];
  for (const d of snap.docs) {
    // One unreadable tape must not hide the rest of the roll.
    const parsed = tapeDocSchema.safeParse(d.data());
    if (parsed.success) tapes.push({ id: d.id, ...parsed.data } as Tape);
    else
      console.warn(
        `Skipping tape ${d.id}: its data could not be read`,
        parsed.error.issues,
      );
  }
  return tapes;
}

export async function saveTape(uid: string, tape: TapeSpec): Promise<string> {
  const { count } = (await getCountFromServer(tapesRef(uid))).data();
  if (count >= MAX_TAPES)
    throw new TapeLimitError(`You can keep up to ${MAX_TAPES} tapes.`);
  const id = crypto.randomUUID();
  await setDoc(doc(tapesRef(uid), id), {
    // only the plain data is cleaned: the timestamp below is a sentinel object that must stay intact
    ...cleanForFirestore(tape),
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function renameTape(uid: string, id: string, name: string): Promise<void> {
  await updateDoc(doc(tapesRef(uid), id), { name });
}

/** Change a tape's looks and name in place; it keeps its place in the collection. */
export async function updateTape(uid: string, id: string, tape: TapeSpec): Promise<void> {
  await updateDoc(doc(tapesRef(uid), id), { ...cleanForFirestore(tape) });
}

export async function deleteTape(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(tapesRef(uid), id));
}
