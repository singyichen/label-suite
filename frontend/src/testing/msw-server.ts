import { setupServer } from 'msw/node';

/**
 * Shared MSW request-mocking server for Vitest.
 *
 * Individual test files register handlers via `server.use(...)`; the
 * global lifecycle (listen/reset/close) is wired in `./setup.ts`.
 */
export const server = setupServer();
