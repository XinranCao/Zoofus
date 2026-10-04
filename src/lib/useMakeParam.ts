import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * The Make menu links to `/<page>?make=1`: the page opens its "make" dialog once, then the
 * parameter is removed so a refresh or the back button does not open it again.
 */
export function useMakeParam(open: () => void) {
  const [params, setParams] = useSearchParams();
  const wanted = params.get("make") === "1";
  useEffect(() => {
    if (!wanted) return;
    open();
    const next = new URLSearchParams(params);
    next.delete("make");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the parameter appears
  }, [wanted]);
}
