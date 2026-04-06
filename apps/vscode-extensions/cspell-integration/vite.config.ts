import { defineConfig } from "vite";
import { resolve } from "node:path";
import proseMarkVSCodeExtensionIntegratorPlugin from "@prosemark/vscode-extension-integrator/rolldown-plugin";

export default defineConfig({
  plugins: [proseMarkVSCodeExtensionIntegratorPlugin()],
  build: {
    outDir: "dist",
    target: "es2020",
    lib: {
      entry: resolve(__dirname, "src/webview/main.ts"),
      name: "webview",
      formats: ["iife"],
      fileName: () => "webview.js",
    },
    rollupOptions: {
      external: ["vscode"],
    },
  },
});