import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  preview: { headers: { "Cache-Control": "no-store" } },
  server: {
    headers: { "Cache-Control": "no-store" },
    port: 7787,
  },
});