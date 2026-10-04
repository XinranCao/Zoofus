import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Sticker } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

interface Props {
  children: ReactNode;
  /** When this value changes (e.g. the route), a shown error is cleared. */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

function Fallback() {
  const { t } = useTranslation();
  return (
    <div className="zf-page" style={{ paddingTop: 56 }}>
      <EmptyState
        seed="error"
        tone="scrap-pink"
        kicker={t("error.kicker")}
        title={t("error.title")}
        art={<Sticker art="leaf" size={60} />}
        action={
          <Button variant="primary" seed="eb" onClick={() => window.location.assign("/")}>
            {t("error.action")}
          </Button>
        }
      >
        {t("error.body")}
      </EmptyState>
    </div>
  );
}

/** Catches render errors below it so one broken screen does not blank the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey)
      this.setState({ error: null });
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // recorded for /diagnostics by the console.error hook (see src/lib/diagnostics.ts)
    console.error("Unhandled UI error", error, info.componentStack);
  }

  render() {
    return this.state.error ? <Fallback /> : this.props.children;
  }
}
