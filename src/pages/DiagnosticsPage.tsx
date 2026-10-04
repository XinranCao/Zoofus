import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/useAuth";
import { getLog, logAsText, subscribeLog } from "@/lib/diagnostics";
import { runAllChecks, type CheckResult } from "@/lib/healthChecks";
import { useEmulators } from "@/lib/firebase";

/**
 * `/diagnostics`: a developer page (English only, not part of the app's copy). It shows where the
 * app is pointed, runs the checks that tell the usual Firebase failures apart (App Check, Firestore,
 * Storage), lists the recent errors, and copies it all as one block of text for a bug report.
 * How to read it: docs/debugging.md.
 */
export default function DiagnosticsPage() {
  const { currentUser } = useAuth();
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const log = useSyncExternalStore(subscribeLog, () => getLog().length);
  const [verbose, setVerbose] = useState(() => {
    try {
      return localStorage.getItem("zf-debug") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.title = "Zoofus · Diagnostics";
  }, []);

  const facts: [string, string][] = [
    ["Version", __APP_VERSION__],
    ["Backend", useEmulators ? "local emulators" : "production"],
    ["Page", window.location.origin],
    [
      "Signed in",
      currentUser ? `${currentUser.uid} (${currentUser.email ?? "no email"})` : "no",
    ],
    ["Online", String(navigator.onLine)],
    ["Secure context", String(window.isSecureContext)],
    ["Verbose logging", verbose ? "on" : "off"],
    ["Browser", navigator.userAgent],
  ];

  const run = async () => {
    setRunning(true);
    setResults(null);
    try {
      setResults(await runAllChecks());
    } finally {
      setRunning(false);
    }
  };

  const report = () =>
    [
      "Zoofus diagnostics " + new Date().toISOString(),
      ...facts.map(([k, v]) => `${k}: ${v}`),
      "",
      "Checks:",
      ...(results ?? []).map(
        (r) =>
          `${r.skipped ? "SKIP" : r.ok ? "OK  " : "FAIL"} ${r.name} (${r.ms} ms)${r.code ? ` [${r.code}]` : ""} ${r.detail}`,
      ),
      "",
      "Recent errors:",
      logAsText() || "(none)",
    ].join("\n");

  const copy = async () => {
    await navigator.clipboard.writeText(report());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleVerbose = () => {
    try {
      if (verbose) localStorage.removeItem("zf-debug");
      else localStorage.setItem("zf-debug", "1");
    } catch {
      /* storage blocked */
    }
    setVerbose(!verbose);
    window.location.reload();
  };

  return (
    <div className="zf-page" style={{ maxWidth: 860 }}>
      <h1 className="zf-h1">Diagnostics</h1>
      <p>
        Press <b>Run checks</b>, then <b>Copy report</b> and send it with the problem.
        Nothing here leaves your browser unless you send it.
      </p>

      <h2 className="zf-h2">Where this is running</h2>
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "max-content 1fr",
          gap: "4px 16px",
        }}
      >
        {facts.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt className="zf-label">{k}</dt>
            <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{v}</dd>
          </div>
        ))}
      </dl>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "18px 0" }}>
        <Button
          variant="primary"
          icon="check"
          seed="dg-run"
          loading={running}
          onClick={() => void run()}
        >
          Run checks
        </Button>
        <Button
          variant="secondary"
          icon="copy"
          seed="dg-copy"
          onClick={() => void copy()}
        >
          {copied ? "Copied" : "Copy report"}
        </Button>
        <Button variant="quiet" seed="dg-verbose" onClick={toggleVerbose}>
          {verbose ? "Turn verbose logging off" : "Turn verbose logging on"}
        </Button>
      </div>

      <h2 className="zf-h2">Checks</h2>
      {results === null ? (
        <p>{running ? "Running…" : "Not run yet."}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {results.map((r) => (
            <li key={r.name}>
              <b>{r.skipped ? "– " : r.ok ? "✓ " : "✗ "}</b>
              {r.name} <span className="zf-muted">({r.ms} ms)</span>
              {r.code && <code> [{r.code}]</code>}
              <div className="zf-muted" style={{ overflowWrap: "anywhere" }}>
                {r.detail}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="zf-h2">Recent errors ({log})</h2>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          fontSize: 12,
          margin: 0,
        }}
        aria-label="Recent errors"
      >
        {logAsText() || "(none)"}
      </pre>
    </div>
  );
}
