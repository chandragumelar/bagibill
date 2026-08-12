import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const REACT_VENDOR_CHUNK = "react-vendor";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return REACT_VENDOR_CHUNK;
          }
          return undefined;
        },
      },
    },
  },
});
