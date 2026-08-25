import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '../../../shared/constants/query-keys';
import { ApiRequestError, apiRequest } from '../../../shared/services/api-client';

/** `GET /api/v1/health`'s response body (`HealthResponse` in design.md). */
interface HealthStatus {
  status: string;
  version: string;
}

const FALLBACK_ERROR_MESSAGE = 'Health check failed.';

/**
 * Resolves a user-facing message for a failed health check.
 *
 * An `ApiRequestError` carries the backend's own `detail` (already
 * localized per ADR-026), which must be rendered verbatim rather than
 * re-worded. Any other rejection — e.g. the `TypeError` `fetch` throws when
 * the request never reaches the backend at all — has no backend-owned
 * `detail` to show, so it falls back to the thrown error's own message, and
 * finally to a generic string if even that is empty.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && typeof error.errorResponse.detail === 'string') {
    return error.errorResponse.detail;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return FALLBACK_ERROR_MESSAGE;
}

/**
 * Minimal frontend<->backend integration probe (plan.md's Frontend
 * Component Table: `features/health/pages/HealthCheckPage`).
 *
 * Not a production feature page — it exists so `GET /api/v1/health` has a
 * real UI consumer proving the shared `apiRequest` + `QueryClient` stack
 * works end to end. Exempt from design-system tokens, a11y, and responsive
 * requirements per plan.md's Constitution Check (Principle VII: "臨時驗證
 * 元件豁免").
 */
export function HealthCheckPage() {
  const { data, error, status } = useQuery({
    queryKey: QUERY_KEYS.health.status,
    queryFn: async () => {
      const { data } = await apiRequest<HealthStatus>('/health');
      return data;
    },
  });

  if (status === 'pending') {
    return <p role="status">Checking...</p>;
  }

  if (status === 'error') {
    return <p role="alert">{getErrorMessage(error)}</p>;
  }

  return (
    <div>
      <p>{data.status}</p>
      <p>{data.version}</p>
    </div>
  );
}
