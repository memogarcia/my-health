import { createRoot } from "react-dom/client";
import { App } from "./app/App";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app root");

createRoot(app).render(<App />);
