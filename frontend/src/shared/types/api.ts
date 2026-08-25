/**
 * Hand-written stand-in types mirroring `backend/app/schemas/common.py`.
 *
 * design.md scopes OpenAPI-to-TypeScript codegen out of Foundation-Core;
 * these types are the manual placeholder until `shared/api-types/` is
 * generated (account/001, the first real domain API).
 */

/** A single error item within an `ErrorResponse` (FR-116). */
export interface ErrorDetail {
  loc: (string | number)[] | null;
  msg: string;
  type: string;
  error_code: string | null;
}

/** Unified API error response envelope (FR-115). */
export interface ErrorResponse {
  detail: string | ErrorDetail[];
}

/** Generic paginated list response wrapper (FR-068 / FR-069). */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  total_pages: number;
  next_offset: number | null;
}
