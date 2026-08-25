import { QueryClient } from '@tanstack/react-query';

import { ApiRequestError } from './api-client';

const DEFAULT_MAX_RETRIES = 3;

/**
 * Shared TanStack Query `QueryClient` (design.md: `shared/services/query-client.ts`).
 *
 * The default `retry` policy never retries an HTTP 401 — retrying an
 * unauthenticated request cannot succeed without re-authentication, and
 * doing so anyway wastes requests and delays surfacing the auth error to
 * the caller (SC-020). Every other error retries up to
 * `DEFAULT_MAX_RETRIES` times, matching TanStack Query's own default.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiRequestError && error.status === 401) {
          return false;
        }
        return failureCount < DEFAULT_MAX_RETRIES;
      },
    },
  },
});
