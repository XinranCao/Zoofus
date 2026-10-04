import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Reel } from "@/components/ui/Loader";
import { useAuth } from "@/features/auth/useAuth";
import { db, useEmulators } from "@/lib/firebase";
import NotFoundPage from "@/pages/NotFoundPage";

/**
 * Is the signed-in person a project manager? The question is put to the security rules themselves:
 * `adminCheck/ping` can be read only by someone on the manager list in `firestore.rules`, so the
 * list lives in one place and cannot be bypassed by editing the page. (The local emulators let
 * everyone in, since they hold only test data.)
 */
export function useIsManager() {
  const uid = useAuth().currentUser?.uid;
  return useQuery({
    queryKey: ["isManager", uid],
    enabled: Boolean(uid),
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      if (useEmulators) return true;
      try {
        await getDoc(doc(db, "adminCheck", "ping"));
        return true;
      } catch (err) {
        if ((err as { code?: string }).code === "permission-denied") return false;
        throw err;
      }
    },
  });
}

/** Shows its children to project managers only; everyone else sees the ordinary "not found" page. */
export function ManagerGate({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const { data, isPending } = useIsManager();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (isPending)
    return (
      <div
        className="zf-page"
        style={{ display: "grid", placeItems: "center", minHeight: 320 }}
      >
        <Reel label="Checking" />
      </div>
    );
  return data ? children : <NotFoundPage />;
}
