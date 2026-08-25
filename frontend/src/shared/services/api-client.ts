import type { ErrorResponse } from '../types/api';

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';

/**
 * Base URL every request is resolved against.
 *
 * Overridable via `VITE_API_BASE_URL`; defaults to the local backend's
 * default `uvicorn` port so the client works out of the box in dev and
 * in tests without extra configuration.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;

const CORRELATION_ID_HEADER = 'X-Correlation-ID';

/** A successful `apiRequest` result: the parsed body plus response metadata. */
export interface ApiResult<T> {
  data: T;
  /** The response's `X-Correlation-ID` header, or `null` if absent. */
  correlationId: string | null;
}

/**
 * Thrown by `apiRequest` when the response is not `ok` (status outside
 * 200–299). Carries the parsed `ErrorResponse` envelope (FR-115) and the
 * request's correlation id so callers/loggers can cross-reference backend
 * logs.
 */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly correlationId: string | null;
  readonly errorResponse: ErrorResponse;

  constructor(status: number, correlationId: string | null, errorResponse: ErrorResponse) {
    super(typeof errorResponse.detail === 'string' ? errorResponse.detail : 'Request failed');
    this.name = 'ApiRequestError';
    this.status = status;
    this.correlationId = correlationId;
    this.errorResponse = errorResponse;
  }
}

/**
 * Fallback `ErrorResponse` synthesized when a non-2xx response has no body
 * (e.g. some edge-case error responses) or a body that isn't valid JSON
 * (e.g. an HTML error page from a proxy on 502/504). Guarantees callers
 * always see an `ApiRequestError`, never a raw `SyntaxError` (FR-041).
 *
 * These two synthesized `detail` strings stay English on purpose: they are
 * last-resort diagnostics for the case where no backend-produced body exists
 * at all, so they never compete with the localized `detail` the backend owns
 * (ADR-026).
 */
function unparseableErrorResponse(status: number): ErrorResponse {
  return { detail: `Request failed with status ${status}` };
}

/** Synthesized `ErrorResponse` for a 2xx response whose body is not valid JSON. */
function malformedBodyErrorResponse(status: number): ErrorResponse {
  return { detail: `Response body was not valid JSON (status ${status})` };
}

/**
 * Reads a response body as JSON.
 *
 * Returns `undefined` **only** for an empty body (the project's `204 No
 * Content` convention, `.claude/rules/api.md`). A non-empty body that fails
 * to parse is a genuine fault — a truncated stream, proxy corruption, or a
 * backend serialization bug — and must stay distinguishable from "no
 * content" rather than collapsing into the same `undefined`.
 *
 * @throws SyntaxError When a non-empty body is not valid JSON.
 */
async function readJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  return text.length === 0 ? undefined : (JSON.parse(text) as unknown);
}

/**
 * Fetch wrapper for the Label Suite API (`shared/services/api-client.ts`
 * per design.md's API contract section).
 *
 * Resolves `path` against `API_BASE_URL`, parses JSON responses, and
 * exposes the response's `X-Correlation-ID` header to callers via
 * `ApiResult`. Non-2xx responses are parsed as `ErrorResponse` (FR-115) and
 * thrown as `ApiRequestError`. `Content-Type: application/json` is only set
 * when the request has a body — `application/json` is not a CORS-safelisted
 * content type, so setting it unconditionally would force a preflight on
 * every bodyless (e.g. `GET`) request.
 *
 * @param path - Path relative to `API_BASE_URL` (e.g. `/health`).
 * @param init - Standard `fetch` options, merged with request defaults.
 * @returns The parsed response body and correlation id. A bodyless success
 *   (`204 No Content`) yields `data: undefined` cast to `T` — callers of a
 *   `204` endpoint are expected to instantiate `T` as `undefined`.
 * @throws ApiRequestError When the response status is not in the 2xx range,
 *   or when a 2xx response carries a non-empty body that is not valid JSON.
 */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  const correlationId = response.headers.get(CORRELATION_ID_HEADER);

  if (!response.ok) {
    let body: unknown;
    try {
      body = await readJsonBody(response);
    } catch {
      body = undefined;
    }
    const errorResponse = (body ?? unparseableErrorResponse(response.status)) as ErrorResponse;
    throw new ApiRequestError(response.status, correlationId, errorResponse);
  }

  let data: T;
  try {
    data = (await readJsonBody(response)) as T;
  } catch {
    throw new ApiRequestError(
      response.status,
      correlationId,
      malformedBodyErrorResponse(response.status),
    );
  }
  return { data, correlationId };
}
