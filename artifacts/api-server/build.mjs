/**
 * @file esbuild configuration for the AURELION Express API server bundle.
 *
 * Compiles all server-side TypeScript into a single ESM file at
 * `dist/index.mjs` so the production deployment only needs Node.js and
 * the external native dependencies listed in {@link external}.
 *
 * ## Key design decisions
 *
 * 1. **ESM output with CJS compatibility banner** -- The output format is
 *    ESM (`.mjs`), but many npm packages (e.g. Express) ship only CJS.
 *    A banner is injected at the top of the bundle that creates
 *    `require()`, `__filename`, and `__dirname` globals so CJS-only code
 *    works seamlessly inside the ESM wrapper.
 *
 * 2. **Externals list** -- Packages that use native N-API addons, dynamic
 *    path resolution, or worker threads cannot be statically bundled.
 *    They are listed in `external` and must be installed at runtime.
 *    The list is intentionally broad: entries that are not actually
 *    imported are harmless but prevent future breakage if added later.
 *
 * 3. **pino plugin** -- pino spawns worker threads for its transports.
 *    `esbuild-plugin-pino` rewrites the worker creation paths so they
 *    resolve correctly in the bundled output (with `pino-pretty` as the
 *    registered transport).
 *
 * 4. **Source maps** -- Linked source maps are emitted alongside the
 *    bundle so stack traces in error logs point back to the original
 *    TypeScript source.
 *
 * ## Usage
 *
 * ```bash
 * # From the monorepo root:
 * pnpm --filter api-server run build
 * # Or directly:
 * node artifacts/api-server/build.mjs
 * ```
 *
 * @see {@link ../../artifacts/aurelion/vite.config.ts} The frontend build
 *   whose output is served as static files by this API server.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm } from "node:fs/promises";

/**
 * Polyfill `require` on `globalThis` so esbuild plugins (e.g.
 * `esbuild-plugin-pino`) that internally call `require.resolve()` work
 * correctly in this ESM build script.
 */
globalThis.require = createRequire(import.meta.url);

/** Absolute path to the `api-server` artifact directory. */
const artifactDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Performs the full production build of the API server.
 *
 * 1. Cleans the `dist/` directory to remove stale artifacts.
 * 2. Invokes esbuild with the configuration described in the file header.
 * 3. Writes `dist/index.mjs` (the runnable server) plus `.mjs.map` source
 *    maps.
 *
 * @returns {Promise<void>} Resolves when the build completes successfully.
 * @throws  Rejects (and exits with code 1) on any build error.
 */
async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    /** Single entry point: the Express server bootstrap module. */
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],

    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,

    /** Rename `.js` -> `.mjs` so Node treats the output as ESM. */
    outExtension: { ".js": ".mjs" },
    logLevel: "info",

    /**
     * **External packages list.**
     *
     * Packages listed here are NOT included in the bundle.  They must be
     * present in `node_modules` at runtime.  Reasons for externalization:
     *
     * - **Native addons** (`*.node`, `sharp`, `better-sqlite3`, etc.) --
     *   contain compiled C/C++ binaries that esbuild cannot process.
     * - **Dynamic file loaders** (`@google-cloud/*`, `protobufjs`) --
     *   resolve sibling `.proto` / `.json` files via path traversal that
     *   breaks when inlined into a single bundle.
     * - **Optional / heavy SDKs** (`@aws-sdk/*`, `firebase-admin`) --
     *   kept external to reduce bundle size; only installed when needed.
     * - **Worker-based packages** (`piscina`, `tinypool`) -- spawn
     *   workers that expect resolvable file paths.
     *
     * Entries that are not currently imported are harmless -- esbuild
     * simply ignores them.  They are listed proactively so adding the
     * dependency later does not require a build-config change.
     */
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],

    /**
     * Emit linked source maps (`*.mjs.map`) so Node.js stack traces
     * reference the original TypeScript file names and line numbers.
     */
    sourcemap: "linked",

    plugins: [
      /**
       * pino transport plugin.
       *
       * pino spawns a worker thread for each registered transport.
       * Without this plugin the worker entry paths would point into the
       * pre-bundle source tree and fail at runtime.  The plugin rewrites
       * them to resolve correctly from `dist/index.mjs`.
       *
       * `pino-pretty` is the only registered transport -- it formats log
       * output as human-readable colored text during development.
       */
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],

    /**
     * **CJS compatibility banner.**
     *
     * Injected verbatim at the top of `dist/index.mjs`.  It creates
     * three globals that CJS-only dependencies expect:
     *
     * - `require`     -- a real `require()` function built from
     *                     `node:module.createRequire`
     * - `__filename`  -- the absolute path of the running bundle
     * - `__dirname`   -- the directory containing the running bundle
     *
     * Without this banner, any CJS dependency that references
     * `require()`, `__filename`, or `__dirname` would throw a
     * `ReferenceError` inside the ESM output.
     */
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
