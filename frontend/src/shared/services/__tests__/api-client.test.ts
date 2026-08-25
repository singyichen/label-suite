import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../../../testing/msw-server';
import { ApiRequestError, apiRequest } from '../api-client';

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

  it('does not set Content-Type on a bodyless request, avoiding a CORS preflight', async () => {
    let receivedContentType: string | null = 'unset';
    server.use(
      http.get('http://localhost:8000/api/v1/health', ({ request }) => {
        receivedContentType = request.headers.get('Content-Type');
        return HttpResponse.json<HealthPayload>({ status: 'ok', version: '0.1.0' });
      }),
    );

    await apiRequest<HealthPayload>('/health');

    expect(receivedContentType).toBeNull();
  });

  it('sets Content-Type: application/json on a request with a body', async () => {
    let receivedContentType: string | null = null;
    server.use(
      http.post('http://localhost:8000/api/v1/health', ({ request }) => {
        receivedContentType = request.headers.get('Content-Type');
        return HttpResponse.json<HealthPayload>({ status: 'ok', version: '0.1.0' });
      }),
    );

    await apiRequest<HealthPayload>('/health', { method: 'POST', body: JSON.stringify({}) });

    expect(receivedContentType).toBe('application/json');
  });

  it('resolves without throwing on a 204 No Content response', async () => {
    server.use(
      http.delete('http://localhost:8000/api/v1/health', () => new HttpResponse(null, { status: 204 })),
    );

    const result = await apiRequest<undefined>('/health', { method: 'DELETE' });

    expect(result.data).toBeUndefined();
  });

  it('throws an ApiRequestError with a synthesized ErrorResponse on a non-JSON error body', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/health', () =>
        HttpResponse.text('<html>Bad Gateway</html>', { status: 502 }),
      ),
    );

    let caughtError: unknown;
    try {
      await apiRequest<HealthPayload>('/health');
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(ApiRequestError);
    const apiError = caughtError as ApiRequestError;
    expect(apiError.status).toBe(502);
    expect(typeof apiError.errorResponse.detail).toBe('string');
  });
});
