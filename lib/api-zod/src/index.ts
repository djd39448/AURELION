/**
 * @file Barrel export for the `@workspace/api-zod` package.
 *
 * This package provides **Zod schemas** generated from the OpenAPI spec.
 * They are used on the server side for request-body validation in Express
 * route handlers, ensuring that runtime data matches the API contract.
 *
 * ## What is re-exported
 *
 * - **`./generated/api`** -- Zod schemas for every request body, query
 *   parameter set, and response shape defined in the OpenAPI spec (e.g.
 *   `loginBody`, `createItineraryBody`, `activityParams`).  Coercion is
 *   enabled for query / path parameters so string values from Express
 *   `req.query` and `req.params` are automatically cast to the expected
 *   types.
 *
 * - **`./generated/types`** -- Inferred TypeScript types derived from
 *   the Zod schemas (e.g. `LoginBody`, `CreateItineraryBody`).  These
 *   are equivalent to the interfaces in `api-client-react` but generated
 *   via `z.infer<>` for tighter Zod integration.
 *
 * ## Regeneration
 *
 * ```bash
 * pnpm --filter @workspace/api-spec run codegen
 * ```
 *
 * @module @workspace/api-zod
 * @see {@link ../../api-spec/openapi.yaml} Source of truth for the API contract.
 * @see {@link ../../api-spec/orval.config.ts} Orval configuration for the
 *   `zod` output target.
 */
export * from "./generated/api";

/*
 * NOTE: `./generated/types` is intentionally NOT re-exported here.
 *
 * Orval generates both Zod schema constants (in `./generated/api`) and
 * TypeScript interfaces (in `./generated/types/`) with identical names
 * (e.g. `RegisterBody` exists as both a `zod.ZodObject` constant and an
 * `interface`).  Re-exporting both causes TS2308 "ambiguous export" errors.
 *
 * All consumers import the Zod constants (`.safeParse()`, `.parse()`), so
 * the standalone interfaces are not needed at the package boundary.  If you
 * need the inferred type, use:  `z.infer<typeof RegisterBody>`
 */
