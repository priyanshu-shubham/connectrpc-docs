import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

function protoLoaderPlugin(): Plugin {
  return {
    name: "proto-loader",
    transformIndexHtml(html: string) {
      const protoDir = path.resolve(__dirname, "example/proto");
      const protos: Record<string, string> = {};
      function walk(dir: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (entry.name.endsWith(".proto")) {
            const rel = path.relative(protoDir, full);
            protos[rel] = fs.readFileSync(full, "utf-8");
          }
        }
      }
      walk(protoDir);
      const json = JSON.stringify(protos);
      return html.replace("__PROTO_DATA_PLACEHOLDER__", json);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), protoLoaderPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/bookstore.v1": "http://localhost:8080",
    },
  },
});
