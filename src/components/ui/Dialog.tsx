import * as RDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { useSeed } from "@/paper/useTorn";
import { Icon } from "./Icon";
import { Paper } from "./Paper";
import { Tape } from "./Tape";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  kicker?: ReactNode;
  /** 420 (form), 560 (detail) or 1040 (maker). */
  width?: number;
  tone?: string;
  /** Pieces of tape: at most two, at opposite top corners. */
  tapes?: 0 | 1 | 2;
  /** Right-aligned actions; put a danger action first with a spacer after it. */
  actions?: ReactNode;
  seed?: string;
  /** The maker: a full-bleed sheet under 760px. */
  sheet?: boolean;
  children?: ReactNode;
  /** Called before closing on Esc / outside click; call `preventDefault` to keep it open. */
  onEscapeKeyDown?: (e: KeyboardEvent) => void;
  onInteractOutside?: (e: Event) => void;
}

/**
 * A flat modal sheet torn from a magazine, taped over a loden scrim. Radix Dialog supplies the
 * focus trap, Esc, aria-labelledby and focus return; the torn Paper is the content element.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  kicker,
  width = 460,
  tone = "scrap",
  tapes = 2,
  actions,
  seed,
  sheet,
  children,
  onEscapeKeyDown,
  onInteractOutside,
}: DialogProps) {
  const { t } = useTranslation();
  const id = useSeed(seed);
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="zf-scrim zf-scrim-in" />
        <div className={cn("zf-dialog-pos", sheet && "zf-sheet-pos")}>
          <RDialog.Content
            asChild
            aria-describedby={undefined}
            onEscapeKeyDown={onEscapeKeyDown}
            onInteractOutside={onInteractOutside}
          >
            <Paper
              seed={id}
              size="lg"
              tone={tone}
              rotate={0.4}
              w={width}
              h={320}
              className={cn("zf-dialog-in", sheet && "zf-sheet")}
              style={{ width, maxWidth: "100%" }}
              faceClassName="zf-dialog__face"
              tape={
                tapes > 0 && (
                  <>
                    <Tape seed={id + "a"} x="18%" y="2px" color="tape-mustard" />
                    {tapes === 2 && (
                      <Tape
                        seed={id + "b"}
                        x="84%"
                        y="4px"
                        color="tape-pink"
                        length={60}
                      />
                    )}
                  </>
                )
              }
            >
              <RDialog.Close className="zf-close" aria-label={t("common.close")}>
                <Icon name="x" />
              </RDialog.Close>
              {kicker && (
                <div className="zf-kicker" style={{ marginBottom: 6 }}>
                  {kicker}
                </div>
              )}
              <RDialog.Title className="zf-dialog__title">{title}</RDialog.Title>
              {children}
              {actions && <div className="zf-dialog__actions">{actions}</div>}
            </Paper>
          </RDialog.Content>
        </div>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

/** Dialog body copy. */
export function DialogBody({ children }: { children: ReactNode }) {
  return <p className="zf-dialog__body">{children}</p>;
}
