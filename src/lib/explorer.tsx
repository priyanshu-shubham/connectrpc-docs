import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ExplorerConfig } from "./types";
import App from "../App";

export type { ExplorerConfig };

export interface ExplorerInstance {
  unmount: () => void;
}

export function render(config: ExplorerConfig): ExplorerInstance {
  let root: Root | null = createRoot(config.target);

  root.render(
    <StrictMode>
      <App
        protoFiles={config.protoFiles}
        title={config.title}
        iconUrl={config.iconUrl}
        defaultTheme={config.theme}
        defaultBaseUrl={config.baseUrl}
      />
    </StrictMode>
  );

  return {
    unmount() {
      root?.unmount();
      root = null;
    },
  };
}
