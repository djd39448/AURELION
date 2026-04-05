/**
 * @file Vite configuration for the AURELION React frontend.
 *
 * This is the main build-tool configuration for the luxury Aruba adventure
 * tourism single-page application.  It wires together:
 *
 * - **React** fast-refresh via `@vitejs/plugin-react`
 * - **Tailwind CSS v4** via the first-party `@tailwindcss/vite` plugin
 * - **Replit** runtime-error overlay and (in dev) the Cartographer +
 *   DevBanner plugins when running inside a Repl
 * - **Path aliases** so source files import as `@/components/...` and
 *   shared assets as `@assets/...`
 * - **API proxy** that forwards `/api/*` requests to the Express API
 *   server on port 3001, avoiding CORS during local development
 *
 * ## Environment variables
 *
 * | Variable    | Default          | Purpose                                     |
 * |-------------|------------------|---------------------------------------------|
 * | `PORT`      | `3000`           | Dev-server listen port                      |
 * | `BASE_PATH` | `"/"`            | Public base path (for subdirectory deploys)  |
 * | `API_URL`   | `localhost:3001` | Backend origin for the `/api` proxy target   |
 * | `REPL_ID`   | _(unset)_        | Set automatically inside Replit environments |
 *
 * ## Build output
 *
 * Production bundles are written to `dist/public/` so the API server can
 * serve them as static files from the same origin.
 *
 * @see {@link ../../artifacts/api-server/src/index.ts} Express server that
 *   serves these assets in production and handles the `/api` routes.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

/**
 * Dev-server port.  Defaults to 3000 when the `PORT` env var is absent.
 * In production the compiled assets are served by the Express API server
 * instead, so this value only matters during `vite dev` / `vite preview`.
 */
const port = Number(process.env.PORT) || 3000;

/**
 * Public base path prepended to all asset URLs.  Leave as `"/"` for root
 * deploys; set to e.g. `"/app/"` when the SPA lives under a subdirectory
 * behind a reverse proxy.
 */
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  /** @see {@link basePath} */
  base: basePath,

  /**
   * Vite plugin pipeline.
   *
   * 1. `react()` -- enables React fast-refresh and JSX transform.
   * 2. `tailwindcss()` -- compiles Tailwind utility classes at build time.
   * 3. `runtimeErrorOverlay()` -- shows a modal with stack traces when an
   *    unhandled error occurs during development.
   * 4. Replit-only plugins (loaded dynamically to avoid bundling them in
   *    production or non-Replit environments):
   *    - `cartographer` -- provides the Replit file-tree integration.
   *    - `devBanner` -- shows the "Running on Replit" dev banner.
   */
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],

  resolve: {
    /**
     * Path aliases used throughout the frontend source code:
     *
     * - `@`       -> `./src/`              (components, hooks, pages, etc.)
     * - `@assets` -> `../../attached_assets/` (shared images and static files)
     */
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },

    /**
     * Deduplicate React to prevent "Invalid hook call" errors when
     * workspace packages accidentally bundle their own copy of React.
     */
    dedupe: ["react", "react-dom"],
  },

  /** Explicit root so Vite resolves `index.html` from this artifact dir. */
  root: path.resolve(import.meta.dirname),

  build: {
    /**
     * Output directory for production bundles.
     *
     * The Express API server serves files from `dist/public/` as static
     * assets, so the frontend build must land here for the monorepo
     * deployment to work correctly.
     */
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },

  server: {
    port,

    /**
     * Bind to all network interfaces so the dev server is reachable from
     * Docker containers, VMs, and remote machines (e.g. Replit, Codespaces).
     */
    host: "0.0.0.0",

    /** Accept requests regardless of the Host header value. */
    allowedHosts: true,

    /**
     * Reverse-proxy for API calls during development.
     *
     * All requests starting with `/api` are forwarded to the Express API
     * server (default `http://localhost:3001`).  `changeOrigin: true`
     * rewrites the `Host` header so Express sees `localhost:3001` rather
     * than the Vite dev-server origin.
     */
    proxy: {
      "/api": {
        target: process.env.API_URL || "http://localhost:3001",
        changeOrigin: true,
      },
    },

    fs: {
      /** Restrict file serving to the project root for security. */
      strict: true,
      /** Deny access to dotfiles (`.env`, `.git`, etc.). */
      deny: ["**/.*"],
    },
  },

  /**
   * Preview server settings (used by `vite preview` to serve the
   * production build locally for smoke-testing).
   */
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
