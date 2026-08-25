import { describe, expect, it } from 'vitest';

import { ApiRequestError } from '../api-client';
import { queryClient } from '../query-client';

function getRetryFn() {
  const retry = queryClient.getDefaultOptions().queries?.retry;
  if (typeof retry !== 'function') {
    throw new Error('expected QueryClient default queries.retry to be a function');
  }
  return retry;
}

describe('queryClient retry policy (SC-020)', () => {
  it('does not retry when the error is an HTTP 401', () => {
    const retry = getRetryFn();
    const unauthorized = new ApiRequestError(401, 'corr-1', { detail: 'Unauthorized' });

    expect(retry(0, unauthorized)).toBe(false);
  });

  it('retries other errors up to the default retry count', () => {
    const retry = getRetryFn();
    const serverError = new ApiRequestError(500, null, { detail: 'Internal Server Error' });

    expect(retry(0, serverError)).toBe(true);
    expect(retry(3, serverError)).toBe(false);
  });
});
