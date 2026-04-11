/**
 * @file Orval code-generation configuration for the AURELION monorepo.
 *
 * Reads the OpenAPI spec (`openapi.yaml` in this directory) and produces
 * two independent output targets:
 *
 * ## 1. `api-client-react`  (React Query hooks)
 *
 * - **Output directory:** `lib/api-client-react/src/generated/`
 * - **Generated files:** `api.ts` (hooks), `api.schemas.ts` (TS interfaces)
 * - **Client:** `react-query` -- creates `useQuery` / `useMutation` hooks
 *   for every operation in the spec.
 * - **Mutator:** All generated hooks call `customFetch` (from
 *   `custom-fetch.ts`) instead of the native `fetch`, enabling base-URL
 *   resolution, bearer-token injection, and structured error handling.
 * - **Base URL:** `"/api"` -- matches the Express server mount point.
 *
 * ## 2. `zod`  (Zod validation schemas)
 *
 * - **Output directory:** `lib/api-zod/src/generated/`
 * - **Generated files:** `api.ts` (Zod schemas), `generated/types/` (TS types)
 * - **Client:** `zod` -- creates `z.object(...)` schemas for every request
 *   body, query parameter set, and response shape.
 * - **Coercion:** Enabled for `query` and `param` inputs so that string
 *   values from Express `req.query` / `req.params` are automatically cast
 *   to numbers, booleans, etc.
 * - **Date/BigInt:** `useDates` and `useBigInt` transform ISO strings and
 *   large integers into native JS types during validation.
 *
 * ## Regeneration
 *
 * ```bash
 * pnpm --filter @workspace/api-spec run codegen
 * ```
 *
 * @see {@link ./openapi.yaml} The single source of truth for the API contract.
 * @see {@link ../../lib/api-client-react/src/custom-fetch.ts} Custom fetch
 *   mutator used by the React Query hooks.
 */
import { defineConfig, InputTransformerFn } from "orval";
import path from "path";

/** Monorepo root (two levels up from `lib/api-spec/`). */
const root = path.resolve(__dirname, "..", "..");

/** Source directory for the `@workspace/api-client-react` package. */
const apiClientReactSrc = path.resolve(root, "lib", "api-client-react", "src");

/** Source directory for the `@workspace/api-zod` package. */
const apiZodSrc = path.resolve(root, "lib", "api-zod", "src");

/**
 * Input transformer that forces the OpenAPI `info.title` to `"Api"`.
 *
 * The title determines the generated file names (`api.ts`,
 * `api.schemas.ts`).  All barrel exports in the monorepo assume this
 * naming convention, so changing the title in `openapi.yaml` would break
 * imports throughout the codebase.  This transformer acts as a safety net.
 *
 * @param config - The parsed OpenAPI document (mutable).
 * @returns The same config object with `info.title` set to `"Api"`.
 */
const titleTransformer: InputTransformerFn = (config) => {
  config.info ??= {};
  config.info.title = "Api";

  return config;
};

export default defineConfig({
  // ---------------------------------------------------------------------------
  // Target 1: React Query hooks for the frontend
  // ---------------------------------------------------------------------------
  "api-client-react": {
    input: {
      /** Path to the OpenAPI spec, relative to this config file. */
      target: "./openapi.yaml",
      override: {
        /** Normalize the title to keep generated file names stable. */
        transformer: titleTransformer,
      },
    },
    output: {
      /** Generated files land in `lib/api-client-react/src/generated/`. */
      workspace: apiClientReactSrc,
      target: "generated",

      /** Generate `useQuery` / `useMutation` hooks (TanStack React Query). */
      client: "react-query",

      /**
       * `"split"` mode writes hooks and schemas into separate files
       * (`api.ts` and `api.schemas.ts`) for cleaner imports and
       * tree-shaking.
       */
      mode: "split",

      /**
       * Base URL prepended to every request path in the generated hooks.
       * Matches the Express router mount point (`app.use("/api", router)`).
       */
      baseUrl: "/api",

      /** Delete stale generated files before writing new ones. */
      clean: true,

      /** Run Prettier on generated output for consistent formatting. */
      prettier: true,

      override: {
        fetch: {
          /**
           * Omit the raw `Response` wrapper from hook return types.
           * Hooks return the parsed body directly (e.g. `Activity[]`).
           */
          includeHttpResponseReturnType: false,
        },
        mutator: {
          /**
           * Custom fetch mutator.
           *
           * Points to `customFetch` in `custom-fetch.ts`.  Every
           * generated hook calls this function instead of the native
           * `fetch()`, enabling base-URL resolution, bearer-token
           * injection, and {@link ApiError} wrapping.
           */
          path: path.resolve(apiClientReactSrc, "custom-fetch.ts"),
          name: "customFetch",
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Target 2: Zod schemas for server-side validation
  // ---------------------------------------------------------------------------
  zod: {
    input: {
      /** Same OpenAPI spec as the React Query target. */
      target: "./openapi.yaml",
      override: {
        transformer: titleTransformer,
      },
    },
    output: {
      /** Generated files land in `lib/api-zod/src/generated/`. */
      workspace: apiZodSrc,

      /** Generate Zod `z.object(...)` schemas. */
      client: "zod",

      target: "generated",

      /**
       * TypeScript type definitions inferred from the Zod schemas.
       * Written to `generated/types/` as standalone `.ts` files.
       */
      schemas: { path: "generated/types", type: "typescript" },

      mode: "split",
      clean: true,
      prettier: true,

      override: {
        zod: {
          /**
           * Coercion rules.
           *
           * Express delivers query params and path params as strings.
           * Enabling coercion on `query` and `param` inputs tells the
           * generated Zod schemas to use `z.coerce.number()` etc., so
           * `"42"` is automatically parsed to `42`.
           *
           * `body` and `response` coerce `bigint` and `date` to handle
           * JSON serialisation of large IDs and ISO date strings.
           */
          coerce: {
            query: ['boolean', 'number', 'string'],
            param: ['boolean', 'number', 'string'],
            body: ['bigint', 'date'],
            response: ['bigint', 'date'],
          },
        },

        /** Parse ISO-8601 date strings into native `Date` objects. */
        useDates: true,

        /** Parse large integer strings into native `BigInt` values. */
        useBigInt: true,
      },
    },
  },
});
