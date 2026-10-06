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
  /** Read out with the title by a screen reader (not shown). */
  description?: string;
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
  description,
}: DialogProps) {
  const { t } = useTranslation();
  const id = useSeed(seed);
  // Focus goes back to whatever opened the dialog; if that is gone (a menu item, a tile that was
  // deleted) it goes to the page, never to the top of the document.
  // (noted in a layout effect: it runs before the dialog takes focus)
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const active = document.activeElement as HTMLElement | null;
    // opened from a menu item (the Make menu): the item goes away with the menu, so what the
    // dialog gives focus back to is the button that opened that menu
    const menu = active?.closest('[role="menu"]');
    const trigger = menu?.getAttribute("aria-labelledby");
    opener.current = (trigger && document.getElementById(trigger)) || active;
  }, [open]);
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="zf-scrim zf-scrim-in" />
        <div className={cn("zf-dialog-pos", sheet && "zf-sheet-pos")}>
          <RDialog.Content
            asChild
            {...(description ? {} : { "aria-describedby": undefined })}
            onEscapeKeyDown={onEscapeKeyDown}
            onInteractOutside={onInteractOutside}
            onOpenAutoFocus={(e) => {
              // one rule: the first field to fill in, else the title (never the Close button)
              e.preventDefault();
              const open = document.querySelectorAll<HTMLElement>('[role="dialog"]');
              const content = open[open.length - 1];
              const field = [
                ...(content?.querySelectorAll<HTMLElement>(
                  ".zf-dialog__scroll :is(input:not([type=hidden]):not([type=file]):not([disabled]), textarea:not([disabled]), select:not([disabled]))",
                ) ?? []),
              ].find((el) => el.offsetParent !== null); // a hidden input cannot take focus
              const title = content?.querySelector<HTMLElement>(".zf-dialog__title");
              if (field) field.focus();
              else if (title) {
                title.setAttribute("tabindex", "-1");
                title.focus();
              }
            }}
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
              {kicker && (
                <div className="zf-kicker" style={{ marginBottom: 6 }}>
                  {kicker}
                </div>
              )}
              <RDialog.Title className="zf-dialog__title">{title}</RDialog.Title>
              {description && (
                <RDialog.Description className="sr-only">
                  {description}
                </RDialog.Description>
              )}
              {/* the one scrolling part: title and actions stay in view, the page behind stays put */}
              <div className="zf-dialog__scroll">{children}</div>
              {actions && <div className="zf-dialog__actions">{actions}</div>}
              {/* last in the Tab order (it sits at the top corner by position) */}
              {!hideClose && (
                <RDialog.Close className="zf-close" aria-label={t("common.close")}>
                  <Icon name="x" />
                </RDialog.Close>
              )}
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
