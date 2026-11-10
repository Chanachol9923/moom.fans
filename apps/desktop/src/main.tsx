import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initTheme } from "@moom/shared/theme";
import { App } from "./App";
import "./styles.css";

// Before the first render so the window opens in the right colours.
initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
