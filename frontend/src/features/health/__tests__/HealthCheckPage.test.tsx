// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import type { ErrorResponse } from '../../../shared/types/api';
import { server } from '../../../testing/msw-server';
import { HealthCheckPage } from '../pages/HealthCheckPage';

const HEALTH_URL = 'http://localhost:8000/api/v1/health';

interface HealthPayload {
  status: string;
  version: string;
}

/**
 * Renders `ui` inside a fresh, test-local `QueryClient` (`retry: false`).
 *
 * The shared `queryClient` singleton (`shared/services/query-client.ts`)
 * retries non-401 failures 3 times, which would make the error-state test
 * slow and flaky. A per-test client keeps each test isolated and fast
 * without mutating shared app state.
 */
function renderWithQueryClient(ui: ReactElement): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('HealthCheckPage', () => {
  it('shows a "Checking..." status while the health request is in flight', () => {
    server.use(
      http.get(HEALTH_URL, async () => {
        await delay('infinite');
        return HttpResponse.json<HealthPayload>({ status: 'ok', version: '0.1.0' });
      }),
    );

    renderWithQueryClient(<HealthCheckPage />);

    expect(screen.getByRole('status').textContent).toBe('Checking...');
  });

  it('renders the backend status and version on a successful health check', async () => {
    server.use(
      http.get(HEALTH_URL, () => HttpResponse.json<HealthPayload>({ status: 'ok', version: '0.1.0' })),
    );

    renderWithQueryClient(<HealthCheckPage />);

    expect(await screen.findByText('ok')).not.toBeNull();
    expect(screen.getByText('0.1.0')).not.toBeNull();
  });

  it('renders an inline error message when the health check request fails', async () => {
    server.use(
      http.get(HEALTH_URL, () =>
        HttpResponse.json<ErrorResponse>({ detail: 'Service unavailable' }, { status: 500 }),
      ),
    );

    renderWithQueryClient(<HealthCheckPage />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Service unavailable');
  });

  it('renders an inline error message when the request never reaches the backend', async () => {
    server.use(http.get(HEALTH_URL, () => HttpResponse.error()));

    renderWithQueryClient(<HealthCheckPage />);

    // A genuine transport failure rejects with a `TypeError` from `fetch`,
    // not an `ApiRequestError`, so there is no backend-owned `detail` to
    // render. The page must still fail in place with a non-empty message
    // rather than only handling the `ApiRequestError` shape — tasks.md 7.1
    // names this case ("網路錯誤") specifically.
    const alert = await screen.findByRole('alert');
    expect(alert.textContent?.trim()).not.toBe('');
    expect(alert.textContent).not.toContain('undefined');
  });
});
