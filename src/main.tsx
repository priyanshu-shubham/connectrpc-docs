import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/noto-sans";
import "./index.css";
import App from "./App.tsx";

// Standalone mode: reads proto data from the DOM
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
