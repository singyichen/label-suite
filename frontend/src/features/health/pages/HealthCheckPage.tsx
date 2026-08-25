import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '../../../shared/constants/query-keys';
import { apiRequest } from '../../../shared/services/api-client';

/** `GET /api/v1/health`'s response body (`HealthResponse` in design.md). */
interface HealthStatus {
  status: string;
  version: string;
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
    // `error.message` is already the right string to show: `ApiRequestError`
    // puts the backend's own `detail` there (api-client.ts), which ADR-026
    // says must be rendered verbatim, and any other rejection — e.g. the
    // `TypeError` `fetch` throws when the request never reaches the backend —
    // carries its own description. Re-deriving it here would just duplicate
    // that mapping in a second place.
    return <p role="alert">{error.message}</p>;
  }

  return (
    <div>
      <p>{data.status}</p>
      <p>{data.version}</p>
    </div>
  );
}
