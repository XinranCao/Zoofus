import * as RTooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { Paper } from "./Paper";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RTooltip.Provider delayDuration={400} skipDelayDuration={200}>
      {children}
    </RTooltip.Provider>
  );
}

/**
 * A tiny dark torn label (the one place loden is a fill) shown after 400ms on hover or focus.
 * Use it for keyboard shortcuts ("Undo (⌘Z)"); never put essential information in it.
 */
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content asChild sideOffset={6}>
          <Paper
            seed={"tt" + label}
            size="xs"
            rotate={0}
            inline
            w={100}
            h={28}
            className="zf-tooltip z-[60]"
          >
            {label}
          </Paper>
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}
