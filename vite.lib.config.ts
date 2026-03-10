import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Builds a single self-contained IIFE file with CSS auto-injected.
// Usage via jsDelivr (GitHub):
//   https://cdn.jsdelivr.net/gh/USER/REPO@TAG/apidocs/dist/api-explorer.iife.js
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/lib/explorer-standalone.tsx"),
      name: "ApiExplorer",
      fileName: "api-explorer",
      formats: ["iife"],
    },
    outDir: "dist",
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        assetFileNames: "[name].[ext]",
      },
    },
  },
});
