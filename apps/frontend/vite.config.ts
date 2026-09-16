import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "POS System",
        short_name: "POS",
        display: "fullscreen",
        orientation: "landscape",
        theme_color: "#111827",
        background_color: "#111827",
        icons: [],
      },
    }),
  ],
  server: {
    port: Number(process.env.FRONTEND_PORT ?? 5173),
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
