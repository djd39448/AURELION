/**
 * @file Custom fetch wrapper for the AURELION API client.
 *
 * This module is the network layer used by **every** Orval-generated React
 * Query hook in `api-client-react/src/generated/`.  Orval's `mutator`
 * config points here so that `customFetch` replaces the default `fetch`
 * call in all generated query / mutation functions.
 *
 * ## Responsibilities
 *
 * - **Base URL resolution** -- Expo and other non-web clients call
 *   {@link setBaseUrl} to target a remote API server.  Web clients leave
 *   it unset and rely on the Vite dev proxy or same-origin deployment.
 *
 * - **Bearer token injection** -- Mobile clients call
 *   {@link setAuthTokenGetter} to provide a JWT; the token is attached as
 *   an `Authorization: Bearer` header.  Web clients use session cookies
 *   instead and should never set this.
 *
 * - **Response parsing** -- Handles JSON, text, and blob responses.
 *   Strips UTF-8 BOM, gracefully handles empty bodies and `204 No
 *   Content`, and falls back across content types.
 *
 * - **Error wrapping** -- Non-2xx responses throw {@link ApiError} with
 *   the parsed body, HTTP status, method, and URL for structured error
 *   handling in React Query's `onError` callbacks.
 *
 * @module custom-fetch
 * @see {@link ./generated/api.ts} Generated hooks that call `customFetch`.
 * @see {@link ../../api-spec/orval.config.ts} Orval config that wires this
 *   module as the mutator.
 */

/**
 * Extended `RequestInit` with an optional `responseType` hint.
 *
 * When `responseType` is `"auto"` (the default), the response
 * Content-Type header determines how the body is parsed.  Explicit values
 * override that heuristic.
 */
export type CustomFetchOptions = RequestInit & {
  responseType?: "json" | "text" | "blob" | "auto";
};

/**
 * Convenience alias re-exported so Orval-generated code can reference the
 * error type generically.  Maps to {@link ApiError}.
 *
 * @template T - Shape of the parsed error response body.
 */
export type ErrorType<T = unknown> = ApiError<T>;

/**
 * Identity type used by Orval for request body generics.
 * No transformation is applied -- the body is passed through as-is.
 *
 * @template T - Shape of the request body.
 */
export type BodyType<T> = T;

/**
 * Signature for the function registered via {@link setAuthTokenGetter}.
 *
 * May be synchronous or async.  Return `null` to skip the Authorization
 * header (e.g. when the user is not logged in).
 */
export type AuthTokenGetter = () => Promise<string | null> | string | null;

/**
 * HTTP status codes that never carry a response body, per RFC 9110.
 * Used by {@link hasNoBody} to skip body parsing and avoid runtime errors.
 */
const NO_BODY_STATUS = new Set([204, 205, 304]);

/**
 * Default `Accept` header value when the caller requests JSON.
 * Includes `application/problem+json` (RFC 9457) so API error responses
 * using the Problem Details format are also accepted.
 */
const DEFAULT_JSON_ACCEPT = "application/json, application/problem+json";

// ---------------------------------------------------------------------------
// Module-level configuration
// ---------------------------------------------------------------------------

/**
 * Module-level API base URL.  When set, all relative request paths
 * (starting with `/`) are prefixed with this origin.
 * @see {@link setBaseUrl}
 */
let _baseUrl: string | null = null;

/**
 * Module-level bearer-token provider.  Called before every fetch when set.
 * @see {@link setAuthTokenGetter}
 */
let _authTokenGetter: AuthTokenGetter | null = null;

/**
 * Set a base URL that is prepended to every relative request URL
 * (i.e. paths that start with `/`).
 *
 * Useful for Expo bundles that need to call a remote API server.
 * Pass `null` to clear the base URL.
 */
export function setBaseUrl(url: string | null): void {
  _baseUrl = url ? url.replace(/\/+$/, "") : null;
}

/**
 * Register a getter that supplies a bearer auth token.  Before every fetch
 * the getter is invoked; when it returns a non-null string, an
 * `Authorization: Bearer <token>` header is attached to the request.
 *
 * Useful for Expo bundles making token-gated API calls.
 * Pass `null` to clear the getter.
 *
 * NOTE: This function should never be used in web applications where session
 * token cookies are automatically associated with API calls by the browser.
 */
export function setAuthTokenGetter(getter: AuthTokenGetter | null): void {
  _authTokenGetter = getter;
}

/**
 * Type guard: returns `true` when `input` is a {@link Request} instance.
 *
 * @param input - The fetch input to test.
 * @returns `true` if `input` is a `Request` object.
 */
function isRequest(input: RequestInfo | URL): input is Request {
  return typeof Request !== "undefined" && input instanceof Request;
}

/**
 * Determines the HTTP method for a request.
 *
 * Priority: explicit `method` parameter > `Request.method` > `"GET"`.
 *
 * @param input          - The fetch input (string URL, URL, or Request).
 * @param explicitMethod - Optional method override from {@link CustomFetchOptions}.
 * @returns Uppercased HTTP method string.
 */
function resolveMethod(input: RequestInfo | URL, explicitMethod?: string): string {
  if (explicitMethod) return explicitMethod.toUpperCase();
  if (isRequest(input)) return input.method.toUpperCase();
  return "GET";
}

/**
 * Type guard: returns `true` when `input` is a {@link URL} instance.
 *
 * Uses a loose `instanceof` check because some runtimes (e.g. React
 * Native) ship a URL polyfill that doesn't share the same prototype.
 *
 * @param input - The fetch input to test.
 */
function isUrl(input: RequestInfo | URL): input is URL {
  return typeof URL !== "undefined" && input instanceof URL;
}

/**
 * Prepends the configured {@link _baseUrl} to relative paths.
 *
 * Only modifies paths that start with `/`.  Absolute URLs and URLs
 * without a leading slash are returned unchanged.  Preserves the
 * original input type (string, URL, or Request).
 *
 * @param input - Original fetch input.
 * @returns The input with base URL prepended, or unchanged if not needed.
 */
function applyBaseUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!_baseUrl) return input;
  const url = resolveUrl(input);
  // Only prepend to relative paths (starting with /)
  if (!url.startsWith("/")) return input;

  const absolute = `${_baseUrl}${url}`;
  if (typeof input === "string") return absolute;
  if (isUrl(input)) return new URL(absolute);
  return new Request(absolute, input as Request);
}

/**
 * Extracts a URL string from any fetch input type.
 *
 * @param input - string URL, URL object, or Request.
 * @returns Plain URL string.
 */
function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (isUrl(input)) return input.toString();
  return input.url;
}

/**
 * Merges multiple header sources into a single {@link Headers} object.
 *
 * Later sources overwrite earlier ones for the same header name.
 * `undefined` sources are silently skipped.
 *
 * @param sources - Zero or more `HeadersInit` values to merge.
 * @returns A new `Headers` instance containing the merged result.
 */
function mergeHeaders(...sources: Array<HeadersInit | undefined>): Headers {
  const headers = new Headers();

  for (const source of sources) {
    if (!source) continue;
    new Headers(source).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
}

/**
 * Extracts the media type (MIME type without parameters) from the
 * `Content-Type` header.
 *
 * @param headers - Response headers.
 * @returns Lowercased media type (e.g. `"application/json"`), or `null`.
 */
function getMediaType(headers: Headers): string | null {
  const value = headers.get("content-type");
  return value ? value.split(";", 1)[0].trim().toLowerCase() : null;
}

/**
 * Returns `true` for `application/json` and any `+json` suffix type
 * (e.g. `application/problem+json`).
 */
function isJsonMediaType(mediaType: string | null): boolean {
  return mediaType === "application/json" || Boolean(mediaType?.endsWith("+json"));
}

/**
 * Returns `true` for text-like media types (`text/*`, XML variants,
 * `application/x-www-form-urlencoded`).
 */
function isTextMediaType(mediaType: string | null): boolean {
  return Boolean(
    mediaType &&
      (mediaType.startsWith("text/") ||
        mediaType === "application/xml" ||
        mediaType === "text/xml" ||
        mediaType.endsWith("+xml") ||
        mediaType === "application/x-www-form-urlencoded"),
  );
}

/**
 * Determines whether a response should be treated as having no body.
 *
 * Checks, in order: HEAD method, well-known bodyless status codes
 * (204/205/304), `Content-Length: 0`, and `response.body === null`.
 *
 * **Important:** Uses strict equality (`=== null`) rather than loose
 * equality (`== null`) because React Native sets `response.body` to
 * `undefined` (ReadableStream is unimplemented) even for responses that
 * carry a full payload readable via `.text()` or `.json()`.  Loose
 * equality would incorrectly match `undefined` and skip parsing.
 *
 * @param response - The `Response` to inspect.
 * @param method   - The HTTP method used for the request.
 * @returns `true` when body parsing should be skipped.
 */
function hasNoBody(response: Response, method: string): boolean {
  if (method === "HEAD") return true;
  if (NO_BODY_STATUS.has(response.status)) return true;
  if (response.headers.get("content-length") === "0") return true;
  if (response.body === null) return true;
  return false;
}

/**
 * Strips the UTF-8 BOM (U+FEFF) from the start of a string if present.
 * Some servers or proxies prepend this byte-order mark to JSON responses.
 */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Quick heuristic: returns `true` when the (trimmed) text starts with
 * `{` or `[`, suggesting it is a JSON object or array.
 */
function looksLikeJson(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

/**
 * Safely extracts a non-empty string property from an unknown value.
 * Returns `undefined` when the value is not an object, the key is
 * missing, or the trimmed string is empty.
 */
function getStringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;

  const candidate = (value as Record<string, unknown>)[key];
  if (typeof candidate !== "string") return undefined;

  const trimmed = candidate.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Truncates a string to `maxLength` characters, appending an ellipsis
 * if truncated.  Used to keep error messages at a readable length.
 */
function truncate(text: string, maxLength = 300): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

/**
 * Constructs a human-readable error message from an HTTP response and
 * its parsed body.
 *
 * Attempts to extract structured fields in priority order:
 * `title` + `detail` (RFC 9457 Problem Details), `detail` alone,
 * `message`, `error_description`, and `error`.  Falls back to the raw
 * text body (truncated) or just `"HTTP <status> <statusText>"`.
 *
 * @param response - The non-OK `Response`.
 * @param data     - The parsed (or raw) response body.
 * @returns Formatted error message string.
 */
function buildErrorMessage(response: Response, data: unknown): string {
  const prefix = `HTTP ${response.status} ${response.statusText}`;

  if (typeof data === "string") {
    const text = data.trim();
    return text ? `${prefix}: ${truncate(text)}` : prefix;
  }

  const title = getStringField(data, "title");
  const detail = getStringField(data, "detail");
  const message =
    getStringField(data, "message") ??
    getStringField(data, "error_description") ??
    getStringField(data, "error");

  if (title && detail) return `${prefix}: ${title} — ${detail}`;
  if (detail) return `${prefix}: ${detail}`;
  if (message) return `${prefix}: ${message}`;
  if (title) return `${prefix}: ${title}`;

  return prefix;
}

/**
 * Rich error class thrown by {@link customFetch} for non-2xx HTTP
 * responses.
 *
 * Carries the full response metadata so React Query `onError` handlers,
 * error boundaries, and toast notifications can display context-aware
 * messages (e.g. "POST /api/auth/login 401 Invalid credentials").
 *
 * @template T - Shape of the parsed error response body (`data`).
 *
 * @example
 * ```ts
 * try {
 *   await customFetch("/api/auth/login", { method: "POST", body });
 * } catch (err) {
 *   if (err instanceof ApiError && err.status === 401) {
 *     // Handle invalid credentials
 *   }
 * }
 * ```
 */
export class ApiError<T = unknown> extends Error {
  readonly name = "ApiError";
  /** HTTP status code (e.g. 401, 404, 500). */
  readonly status: number;
  /** HTTP status text (e.g. "Unauthorized", "Not Found"). */
  readonly statusText: string;
  /** Parsed response body, or `null` when the response had no body. */
  readonly data: T | null;
  /** Response headers for inspecting rate-limit / retry-after values. */
  readonly headers: Headers;
  /** The raw `Response` object for advanced use cases. */
  readonly response: Response;
  /** HTTP method used for the request (e.g. "GET", "POST"). */
  readonly method: string;
  /** Final request URL (after base URL resolution and redirects). */
  readonly url: string;

  /**
   * @param response    - The non-OK `Response` from the server.
   * @param data        - The parsed error body (JSON, text, or blob).
   * @param requestInfo - Method and URL used for the request (pre-redirect).
   */
  constructor(
    response: Response,
    data: T | null,
    requestInfo: { method: string; url: string },
  ) {
    super(buildErrorMessage(response, data));
    Object.setPrototypeOf(this, new.target.prototype);

    this.status = response.status;
    this.statusText = response.statusText;
    this.data = data;
    this.headers = response.headers;
    this.response = response;
    this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
  }
}

/**
 * Error thrown when a response that was expected to be JSON could not be
 * parsed.
 *
 * This is distinct from {@link ApiError} (which wraps non-2xx responses).
 * A `ResponseParseError` means the server returned a 2xx status but the
 * body was not valid JSON -- typically caused by an upstream proxy
 * injecting an HTML error page.
 *
 * The {@link rawBody} property preserves the unparsable text for
 * debugging / logging.
 */
export class ResponseParseError extends Error {
  readonly name = "ResponseParseError";
  /** HTTP status code of the (successful) response. */
  readonly status: number;
  /** HTTP status text. */
  readonly statusText: string;
  /** Response headers. */
  readonly headers: Headers;
  /** The raw `Response` object. */
  readonly response: Response;
  /** HTTP method of the request. */
  readonly method: string;
  /** Request URL. */
  readonly url: string;
  /** The raw text body that failed to parse as JSON. */
  readonly rawBody: string;
  /** The underlying `SyntaxError` from `JSON.parse`. */
  readonly cause: unknown;

  /**
   * @param response    - The `Response` whose body could not be parsed.
   * @param rawBody     - The raw text that was not valid JSON.
   * @param cause       - The `JSON.parse` error.
   * @param requestInfo - Method and URL for the request.
   */
  constructor(
    response: Response,
    rawBody: string,
    cause: unknown,
    requestInfo: { method: string; url: string },
  ) {
    super(
      `Failed to parse response from ${requestInfo.method} ${response.url || requestInfo.url} ` +
        `(${response.status} ${response.statusText}) as JSON`,
    );
    Object.setPrototypeOf(this, new.target.prototype);

    this.status = response.status;
    this.statusText = response.statusText;
    this.headers = response.headers;
    this.response = response;
    this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
    this.rawBody = rawBody;
    this.cause = cause;
  }
}

/**
 * Reads the response body as text, strips the BOM, and parses as JSON.
 * Returns `null` for empty bodies.  Throws {@link ResponseParseError}
 * when the text is non-empty but not valid JSON.
 */
async function parseJsonBody(
  response: Response,
  requestInfo: { method: string; url: string },
): Promise<unknown> {
  const raw = await response.text();
  const normalized = stripBom(raw);

  if (normalized.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(normalized);
  } catch (cause) {
    throw new ResponseParseError(response, raw, cause, requestInfo);
  }
}

/**
 * Best-effort parsing of an error response body.
 *
 * Tries JSON first (based on Content-Type or heuristic), then falls back
 * to plain text.  Non-text/non-JSON types are returned as blobs (or text
 * when `blob()` is unavailable, e.g. React Native).  Never throws -- a
 * parse failure returns the raw text so the caller can still construct a
 * meaningful {@link ApiError}.
 */
async function parseErrorBody(response: Response, method: string): Promise<unknown> {
  if (hasNoBody(response, method)) {
    return null;
  }

  const mediaType = getMediaType(response.headers);

  // Fall back to text when blob() is unavailable (e.g. some React Native builds).
  if (mediaType && !isJsonMediaType(mediaType) && !isTextMediaType(mediaType)) {
    return typeof response.blob === "function" ? response.blob() : response.text();
  }

  const raw = await response.text();
  const normalized = stripBom(raw);
  const trimmed = normalized.trim();

  if (trimmed === "") {
    return null;
  }

  if (isJsonMediaType(mediaType) || looksLikeJson(normalized)) {
    try {
      return JSON.parse(normalized);
    } catch {
      return raw;
    }
  }

  return raw;
}

/**
 * Infers the appropriate parse strategy from the response Content-Type.
 * Returns `"text"` as the default when no Content-Type header is present.
 */
function inferResponseType(response: Response): "json" | "text" | "blob" {
  const mediaType = getMediaType(response.headers);

  if (isJsonMediaType(mediaType)) return "json";
  if (isTextMediaType(mediaType) || mediaType == null) return "text";
  return "blob";
}

/**
 * Parses a successful (2xx) response body according to `responseType`.
 *
 * When `responseType` is `"auto"`, delegates to {@link inferResponseType}
 * to decide based on the Content-Type header.  Returns `null` for
 * bodyless responses (204, HEAD, etc.).
 *
 * @throws {ResponseParseError} When JSON parsing fails.
 * @throws {TypeError}          When blob is requested but unsupported.
 */
async function parseSuccessBody(
  response: Response,
  responseType: "json" | "text" | "blob" | "auto",
  requestInfo: { method: string; url: string },
): Promise<unknown> {
  if (hasNoBody(response, requestInfo.method)) {
    return null;
  }

  const effectiveType =
    responseType === "auto" ? inferResponseType(response) : responseType;

  switch (effectiveType) {
    case "json":
      return parseJsonBody(response, requestInfo);

    case "text": {
      const text = await response.text();
      return text === "" ? null : text;
    }

    case "blob":
      if (typeof response.blob !== "function") {
        throw new TypeError(
          "Blob responses are not supported in this runtime. " +
            "Use responseType \"json\" or \"text\" instead.",
        );
      }
      return response.blob();
  }
}

/**
 * Custom fetch wrapper used by all Orval-generated React Query hooks.
 *
 * This is the single network entry point for the AURELION API client.
 * It handles base-URL resolution, bearer-token injection, content-type
 * negotiation, response parsing, and structured error wrapping.
 *
 * ## Call flow
 *
 * 1. Prepend {@link _baseUrl} to relative paths (Expo / remote clients).
 * 2. Merge caller-supplied headers with auto-detected Content-Type and
 *    Accept headers.
 * 3. Attach `Authorization: Bearer` header if a token getter is set.
 * 4. Execute the native `fetch()`.
 * 5. On non-2xx: parse the error body and throw {@link ApiError}.
 * 6. On 2xx: parse the success body per `responseType` and return it.
 *
 * @template T - Expected shape of the parsed response body.
 * @param input   - URL string, URL object, or Request.
 * @param options - Extended fetch options with optional `responseType`.
 * @returns The parsed response body cast to `T`.
 *
 * @throws {ApiError}           On non-2xx HTTP responses.
 * @throws {ResponseParseError} When a JSON response body is malformed.
 * @throws {TypeError}          When a body is sent with GET/HEAD, or blob
 *                               is requested in an unsupported runtime.
 */
export async function customFetch<T = unknown>(
  input: RequestInfo | URL,
  options: CustomFetchOptions = {},
): Promise<T> {
  input = applyBaseUrl(input);
  const { responseType = "auto", headers: headersInit, ...init } = options;

  const method = resolveMethod(input, init.method);

  if (init.body != null && (method === "GET" || method === "HEAD")) {
    throw new TypeError(`customFetch: ${method} requests cannot have a body.`);
  }

  const headers = mergeHeaders(isRequest(input) ? input.headers : undefined, headersInit);

  if (
    typeof init.body === "string" &&
    !headers.has("content-type") &&
    looksLikeJson(init.body)
  ) {
    headers.set("content-type", "application/json");
  }

  if (responseType === "json" && !headers.has("accept")) {
    headers.set("accept", DEFAULT_JSON_ACCEPT);
  }

  // Attach bearer token when an auth getter is configured and no
  // Authorization header has been explicitly provided.
  if (_authTokenGetter && !headers.has("authorization")) {
    const token = await _authTokenGetter();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  const requestInfo = { method, url: resolveUrl(input) };

  const response = await fetch(input, { ...init, method, headers });

  if (!response.ok) {
    const errorData = await parseErrorBody(response, method);
    throw new ApiError(response, errorData, requestInfo);
  }

  return (await parseSuccessBody(response, responseType, requestInfo)) as T;
}
