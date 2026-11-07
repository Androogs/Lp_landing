import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) }
  },
  // Los archivos compilados van a /static para no mezclarse con /assets (imágenes de public/)
  build: { assetsDir: "static" },
  // En desarrollo, /api se envía al backend local (mismo origen → cookies SameSite=Strict funcionan igual que en producción)
  server: { port: 5173, host: "127.0.0.1", allowedHosts: [".trycloudflare.com"], proxy: { "/api": { target: "http://127.0.0.1:3000", changeOrigin: false } } },
  preview: { port: 4173, host: "127.0.0.1" }
});
