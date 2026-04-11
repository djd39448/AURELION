/**
 * @file Barrel export for the `@workspace/api-client-react` package.
 *
 * This is the public API surface consumed by the AURELION React frontend
 * and any other workspace packages that need to call the backend API.
 *
 * ## What is re-exported
 *
 * - **`./generated/api`** -- Orval-generated React Query hooks
 *   (`useListActivities`, `useGetMe`, `useCreateItinerary`, etc.) and
 *   their option types.  These hooks use {@link customFetch} as the
 *   network layer.
 *
 * - **`./generated/api.schemas`** -- TypeScript interfaces for every
 *   request body and response shape defined in the OpenAPI spec (e.g.
 *   `Activity`, `Itinerary`, `UserSession`).
 *
 * - **`setBaseUrl`** -- Configure the API origin for Expo / non-web
 *   clients.
 *
 * - **`setAuthTokenGetter`** -- Provide a bearer token supplier for
 *   token-gated API calls (mobile only; web uses session cookies).
 *
 * - **`AuthTokenGetter`** -- Type for the token getter function.
 *
 * @module @workspace/api-client-react
 * @see {@link ./custom-fetch.ts} Network layer implementation.
 * @see {@link ../../api-spec/openapi.yaml} Source of truth for the API
 *   contract from which the generated code is derived.
 */
export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
