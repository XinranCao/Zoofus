import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app/App";
import { Providers } from "@/app/providers";
import "@fontsource/special-elite/400.css";
import "@fontsource/courier-prime/400.css";
import "@fontsource/courier-prime/700.css";
import "cn-fontsource-xiaolai-mono-sc-regular/font.css"; // Chinese, split by unicode-range
import "@fontsource/lxgw-wenkai/500.css"; // fallback for any glyph Xiaolai lacks (package has no 400 weight)
import "@/styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>,
);
