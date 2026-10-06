import * as RToast from "@radix-ui/react-toast";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";
import { Paper } from "./Paper";
import { Tape } from "./Tape";

export type ToastKind = "success" | "error" | "info";

export interface ToastInput {
  kind?: ToastKind;
  title: string;
  body?: string;
  /** One quiet action, e.g. "Undo". */
  action?: { label: string; onClick: () => void };
}

const TONES: Record<ToastKind, string> = {
  success: "scrap-cool",
  error: "scrap-pink",
  info: "scrap",
};
const ICONS: Record<ToastKind, IconName> = {
  success: "check",
  error: "alert",
  info: "book",
};

/** A small flat torn note with one piece of tape. Presentational; `ToastProvider` shows them. */
export function ToastNote({
  kind = "info",
  title,
  body,
  action,
  seed,
  className,
  ...rest
}: Omit<ToastInput, "action"> & {
  /** One quiet action element, e.g. an "Undo" button. */
  action?: ReactNode;
  seed?: string;
  className?: string;
} & Record<string, unknown>) {
  const iconColor =
    kind === "error"
      ? "var(--danger-mark)"
      : kind === "success"
        ? "var(--moss-700)"
        : "var(--ink)";
  return (
    <Paper
      seed={seed ?? "toast-" + title}
      size="md"
      tone={TONES[kind]}
      rotate={0.8}
      inline
      w={320}
      h={70}
      className={cn("zf-toast", className)}
      tape={
        <Tape
          seed={"toast-tape-" + title}
          x="50%"
          y="0"
          length={54}
          thickness={16}
          color="tape-mustard"
        />
      }
      {...rest}
    >
      <Icon name={ICONS[kind]} style={{ color: iconColor, marginTop: 2 }} />
      <div>
        <b style={kind === "error" ? { color: "var(--danger)" } : undefined}>{title}</b>
        {body && <span className="zf-toast__body">{body}</span>}
      </div>
      {action}
    </Paper>
  );
}

interface ToastContextValue {
  push: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
}
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

interface Item extends ToastInput {
  id: string;
}

/**
 * Radix Toast. Bottom-centre on mobile, bottom-right on desktop; a note with words or an action stays 8 to 10 s (WCAG 2.2.1), pauses while the pointer or focus is on it, and goes with its close button or Esc; never more than three at once.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const dismiss = useCallback(
    (id: string) => setItems((list) => list.filter((i) => i.id !== id)),
    [],
  );
  const push = useCallback((toast: ToastInput) => {
    const id = crypto.randomUUID();
    setItems((list) => [...list, { ...toast, id }].slice(-3));
    return id;
  }, []);
  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);
  const { t } = useTranslation();
  // Esc puts the newest note away, unless a dialog is open (Esc belongs to it then)
  useEffect(() => {
    if (!items.length) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector('[role="dialog"]')) return;
      const last = items[items.length - 1];
      if (last) dismiss(last.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      <RToast.Provider swipeDirection="right">
        {children}
        {items.map((item) => (
          <RToast.Root
            key={item.id}
            asChild
            type={item.kind === "error" ? "foreground" : "background"}
            duration={item.kind === "error" || item.action ? 10000 : 8000}
            onOpenChange={(open) => !open && dismiss(item.id)}
          >
            <ToastNote
              kind={item.kind}
              title={item.title}
              body={item.body}
              seed={item.id}
              role={item.kind === "error" ? "alert" : "status"}
              className="zf-toast-in"
              action={
                <>
                  {item.action && (
                    <RToast.Action altText={item.action.label} asChild>
                      <button
                        type="button"
                        className="zf-btn zf-torn quiet sm"
                        onClick={item.action.onClick}
                      >
                        <span className="zf-face">{item.action.label}</span>
                      </button>
                    </RToast.Action>
                  )}
                  <RToast.Close asChild>
                    <button
                      type="button"
                      className="zf-toast__close"
                      aria-label={t("common.dismiss")}
                    >
                      <Icon name="x" />
                    </button>
                  </RToast.Close>
                </>
              }
            />
          </RToast.Root>
        ))}
        <RToast.Viewport
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            left: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 12,
            zIndex: 100,
            listStyle: "none",
            margin: 0,
            padding: 0,
            outline: "none",
          }}
        />
      </RToast.Provider>
    </ToastContext.Provider>
  );
}
