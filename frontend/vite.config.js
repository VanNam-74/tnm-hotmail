import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// UI server chạy ở 127.0.0.1:8750 (xem app.ini). Dev proxy /api và /share về đó.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8750",
      "/share": "http://127.0.0.1:8750",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
