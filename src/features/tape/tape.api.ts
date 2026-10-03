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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cleanForFirestore } from "@/paper/patternSchema";
import { MAX_TAPES, tapeDocSchema, type Tape, type TapeSpec } from "./tape.schema";

const tapesRef = (uid: string) => collection(db, "users", uid, "tapes");

export class TapeLimitError extends Error {}

export async function listTapes(uid: string): Promise<Tape[]> {
  const snap = await getDocs(query(tapesRef(uid), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...tapeDocSchema.parse(d.data()) }) as Tape);
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

export async function deleteTape(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(tapesRef(uid), id));
}
