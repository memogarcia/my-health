import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { applyResolvedTheme, resolveTheme } from "./theme";

applyResolvedTheme(document.documentElement, resolveTheme("system", {
  prefersDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
  prefersContrast: window.matchMedia("(prefers-contrast: more)").matches,
  forcedColors: window.matchMedia("(forced-colors: active)").matches,
}));

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app root");

createRoot(app).render(<App />);
