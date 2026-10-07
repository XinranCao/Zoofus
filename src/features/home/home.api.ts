import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** How many documents a list of mine holds, counted by the server (no documents are sent). */
export async function countMine(
  uid: string,
  name: "friends" | "collections",
): Promise<number> {
  return (await getCountFromServer(collection(db, "users", uid, name))).data().count;
}
