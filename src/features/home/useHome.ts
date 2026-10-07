import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/useAuth";
import { countMine } from "./home.api";

/** How many friends or collections there are (one count each, for "Try next"). */
export function useCount(name: "friends" | "collections") {
  const uid = useAuth().currentUser?.uid;
  return useQuery({
    queryKey: ["count", name, uid ?? ""],
    queryFn: () => countMine(uid!, name),
    enabled: Boolean(uid),
    staleTime: 60_000,
  });
}
