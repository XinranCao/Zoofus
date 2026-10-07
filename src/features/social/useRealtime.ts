import { useQueryClient } from "@tanstack/react-query";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Query,
  type Unsubscribe,
} from "firebase/firestore";
import { useEffect } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { db, storage } from "@/lib/firebase";
import { deleteFileIfExists } from "@/lib/storage";
import { ref } from "firebase/storage";
import { cleanFinishedShares } from "./social.api";

/**
 * Keep the friends, requests, shares and invitations lists live. Each listens to the documents it
 * depends on and, when one changes, asks the lists built from them to load again: a request sent to
 * you shows up (and its badge lights) the moment it is written, without a refresh. The first
 * snapshot of each listener is skipped, since the page has just loaded that data itself.
 */
/** How many of the newest documents each list is watched through. */
const WATCHED = 5;

export function useRealtimeSync() {
  const uid = useAuth().currentUser?.uid;
  const qc = useQueryClient();
  useEffect(() => {
    if (!uid) return;
    const stops: Unsubscribe[] = [];
    const watch = (q: Query, keys: (readonly unknown[])[]) => {
      let first = true;
      stops.push(
        onSnapshot(
          q,
          () => {
            if (first) {
              first = false;
              return;
            }
            for (const queryKey of keys) void qc.invalidateQueries({ queryKey });
          },
          () => {
            /* no access (signed out, or rules not yet deployed): the polling still works */
          },
        ),
      );
    };
    const mine = (name: string) => collection(db, "users", uid, name);
    // Only the newest few of each are listened to: a listener delivers every document it matches
    // when it starts, and a long list is not needed to notice that something new has arrived.
    // (A friend removed by the other side shows up at the next poll of the list.)
    const newest = (name: string, field: string) =>
      query(mine(name), orderBy(field, "desc"), limit(WATCHED));
    watch(newest("friends", "since"), [
      ["friends", uid],
      ["requests", uid],
      ["sentRequests", uid],
    ]);
    watch(newest("requests", "createdAt"), [["requests", uid]]);
    watch(newest("sentRequests", "createdAt"), [
      ["sentRequests", uid],
      ["friends", uid],
    ]);
    watch(newest("inbox", "createdAt"), [["inbox", uid]]);
    // what friends have finished with: the pictures I copied for them are no longer needed
    stops.push(
      onSnapshot(
        mine("shareDone"),
        (snap) => {
          if (snap.empty) return;
          void cleanFinishedShares(uid, async (paths) => {
            await Promise.allSettled(
              paths.map((p) => deleteFileIfExists(ref(storage, p))),
            );
          })
            .then((n) => {
              if (n) void qc.invalidateQueries({ queryKey: ["sentShares", uid] });
            })
            .catch(() => {});
        },
        () => {},
      ),
    );
    const workspaces = collection(db, "workspaces");
    watch(query(workspaces, where("invited", "array-contains", uid)), [
      ["workspaces", uid],
    ]);
    watch(query(workspaces, where("members", "array-contains", uid)), [
      ["workspaces", uid],
    ]);
    return () => stops.forEach((stop) => stop());
  }, [uid, qc]);
}
