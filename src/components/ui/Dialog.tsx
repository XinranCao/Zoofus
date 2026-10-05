import * as RDialog from "@radix-ui/react-dialog";
import { useLayoutEffect, useRef, type ReactNode } from "react";
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
  /** No close button (a step the person must finish). */
  hideClose?: boolean;
}

/**
 * A flat modal sheet torn from a magazine, taped over a loden scrim. It never grows past the
 * screen: the title and the actions stay put and only the middle scrolls. Radix Dialog supplies the
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
  hideClose,
}: DialogProps) {
  const { t } = useTranslation();
  const id = useSeed(seed);
  // Focus goes back to whatever opened the dialog; if that is gone (a menu item, a tile that was
  // deleted) it goes to the page, never to the top of the document.
  // (noted in a layout effect: it runs before the dialog takes focus)
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open) opener.current = document.activeElement as HTMLElement | null;
  }, [open]);
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
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              const el = opener.current;
              if (el?.isConnected && el !== document.body) el.focus();
              else document.getElementById("main")?.focus();
            }}
          >
            <Paper
              seed={id}
              size="lg"
              tone={tone}
              rotate={0.4}
              w={width}
              h={320}
              className={cn("zf-dialog-in zf-dialog-box", sheet && "zf-sheet")}
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
              {!hideClose && (
                <RDialog.Close className="zf-close" aria-label={t("common.close")}>
                  <Icon name="x" />
                </RDialog.Close>
              )}
              {kicker && (
                <div className="zf-kicker" style={{ marginBottom: 6 }}>
                  {kicker}
                </div>
              )}
              <RDialog.Title className="zf-dialog__title">{title}</RDialog.Title>
              {/* the one scrolling part: title and actions stay in view, the page behind stays put */}
              <div className="zf-dialog__scroll">{children}</div>
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
