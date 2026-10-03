import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app/App";
import { Providers } from "@/app/providers";
import "@fontsource/special-elite/400.css";
import "@fontsource/courier-prime/400.css";
import "@fontsource/courier-prime/700.css";
import "@/styles/index.css";
import "@/i18n";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>,
);
