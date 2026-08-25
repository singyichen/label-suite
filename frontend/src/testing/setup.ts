import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './msw-server';

// Fail loudly on any request that isn't explicitly mocked, so tests never
// silently hit the network (testing-frontend.md: "mock only at the network
// boundary").
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
