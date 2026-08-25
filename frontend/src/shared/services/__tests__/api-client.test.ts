import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../../../testing/msw-server';
import { apiRequest } from '../api-client';

interface HealthPayload {
  status: string;
  version: string;
}

describe('apiRequest', () => {
  it('exposes the response X-Correlation-ID header to callers', async () => {
    const correlationId = '11111111-1111-4111-8111-111111111111';
    server.use(
      http.get('http://localhost:8000/api/v1/health', () =>
        HttpResponse.json<HealthPayload>(
          { status: 'ok', version: '0.1.0' },
          { headers: { 'X-Correlation-ID': correlationId } },
        ),
      ),
    );

    const result = await apiRequest<HealthPayload>('/health');

    expect(result.correlationId).toBe(correlationId);
    expect(result.data).toEqual({ status: 'ok', version: '0.1.0' });
  });

  it('returns a null correlationId when the header is absent', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/health', () =>
        HttpResponse.json<HealthPayload>({ status: 'ok', version: '0.1.0' }),
      ),
    );

    const result = await apiRequest<HealthPayload>('/health');

    expect(result.correlationId).toBeNull();
  });
});
