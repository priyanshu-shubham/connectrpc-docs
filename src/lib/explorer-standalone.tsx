/**
 * Standalone entry point for CDN/script-tag usage.
 * Auto-injects CSS into <head> when loaded — no separate stylesheet needed.
 *
 * Usage:
 *   <script src="https://cdn.jsdelivr.net/npm/PACKAGE/dist/api-explorer-standalone.iife.js"></script>
 *   <script>
 *     ApiExplorer.render({ target: document.getElementById('root'), protoFiles: {...} });
 *   </script>
 */
import cssText from "../index.css?inline";

// Inject CSS and font into <head> once on script load
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.setAttribute("data-api-explorer", "");
  style.textContent = cssText;
  document.head.appendChild(style);

  // Load Noto Sans from Google Fonts CDN
  if (!document.querySelector('link[data-api-explorer-font]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.setAttribute("data-api-explorer-font", "");
    link.href =
      "https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap";
    document.head.appendChild(link);
  }
}

export { render, type ExplorerConfig, type ExplorerInstance } from "./explorer";
