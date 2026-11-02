import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { request } from "node:https";
import { defineConfig, type Plugin } from "vite";

/**
 * Browser test mode only: /yt/* -> youtube.com, so YouTube chat works without CORS (the
 * installed app uses Tauri's HTTP plugin). Hand-rolled because YouTube's response headers
 * are bigger than Node's default limit, which Vite's own proxy can't raise.
 */
function youtubeDevProxy(): Plugin {
  return {
    name: "moom-youtube-dev-proxy",
    configureServer(server) {
      server.middlewares.use("/yt", (req, res) => {
        const up = request(
          {
            host: "www.youtube.com",
            path: req.url,
            method: req.method,
            maxHeaderSize: 256 * 1024,
            headers: {
              "content-type": req.headers["content-type"] ?? "text/plain",
              "user-agent": req.headers["user-agent"] ?? "Mozilla/5.0",
              "accept-language": "th,en;q=0.8",
            },
          },
          (r) => {
            res.statusCode = r.statusCode ?? 502;
            res.setHeader("content-type", r.headers["content-type"] ?? "text/plain");
            r.pipe(res);
          },
        );
        up.on("error", () => {
          res.statusCode = 502;
          res.end();
        });
        req.pipe(up);
      });
    },
  };
}

// Two pages: index.html is the app window, overlay.html is what OBS loads
// (served by the app's local server on 127.0.0.1:4848 in the installed build).
export default defineConfig({
  plugins: [react(), tailwindcss(), youtubeDevProxy()],
  // Reuse the website's public env (Supabase URL + publishable key) from the repo root.
  envDir: "../..",
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  resolve: {
    alias: { "@moom/shared": fileURLToPath(new URL("../../packages/shared/src", import.meta.url)) },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
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
