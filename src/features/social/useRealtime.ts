import { useQueryClient } from "@tanstack/react-query";
import {
  collection,
  onSnapshot,
  query,
  where,
  type Query,
  type Unsubscribe,
} from "firebase/firestore";
import { useEffect } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { db } from "@/lib/firebase";

/**
 * Keep the friends, requests, shares and invitations lists live. Each listens to the documents it
 * depends on and, when one changes, asks the lists built from them to load again: a request sent to
 * you shows up (and its badge lights) the moment it is written, without a refresh. The first
 * snapshot of each listener is skipped, since the page has just loaded that data itself.
 */
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
    watch(mine("friends"), [
      ["friends", uid],
      ["requests", uid],
      ["sentRequests", uid],
    ]);
    watch(mine("requests"), [["requests", uid]]);
    watch(mine("sentRequests"), [
      ["sentRequests", uid],
      ["friends", uid],
    ]);
    watch(mine("inbox"), [["inbox", uid]]);
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
