import { Alert, Box, Button } from "@mui/material";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/** Catches render errors below it so one broken screen does not blank the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Hook for error reporting (see issue #19).
    console.error("Unhandled UI error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Box sx={{ p: 4, maxWidth: 560, mx: "auto" }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Something went wrong on this page.
        </Alert>
        <Button variant="contained" onClick={() => window.location.assign("/")}>
          Back to home
        </Button>
      </Box>
    );
  }
}
