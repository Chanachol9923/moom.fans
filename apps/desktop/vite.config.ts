import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Two pages: index.html is the app window, overlay.html is what OBS loads
// (served by the app's local server on 127.0.0.1:4848 in the installed build).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Reuse the website's public env (Supabase URL + publishable key) from the repo root.
  envDir: "../..",
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  resolve: {
    alias: { "@moom/shared": fileURLToPath(new URL("../../packages/shared/src", import.meta.url)) },
  },
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("index.html", import.meta.url)),
        overlay: fileURLToPath(new URL("overlay.html", import.meta.url)),
      },
    },
  },
});
