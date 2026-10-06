import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app/App";
import { Providers } from "@/app/providers";
import "@fontsource/special-elite/400.css";
import "@fontsource/courier-prime/400.css";
import "@fontsource/courier-prime/700.css";
import "@/styles/index.css";
import "@/i18n";
import { installDiagnostics } from "@/lib/diagnostics";
import { initLite } from "@/lib/lite";

installDiagnostics();
initLite();

// `crypto.randomUUID` only exists in secure contexts (HTTPS or localhost). Opening a dev build over
// plain http on the local network (http://192.168.x.x:5173) would otherwise break every save.
if (typeof crypto.randomUUID !== "function") {
  Object.defineProperty(crypto, "randomUUID", {
    value: () =>
      "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (
          Number(c) ^
          (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))
        ).toString(16),
      ),
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>,
);
