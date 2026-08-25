import { createBrowserRouter } from 'react-router';

import { ROUTE_PATHS } from './paths';

/**
 * Central route tree (plan.md `routes/index.tsx`: "中央 route tree（lazy
 * import feature pages）").
 *
 * Feature pages are imported via `lazy()` rather than a static top-level
 * import, so each route's code only ships to the client when that route is
 * actually visited instead of bloating the initial bundle with every
 * feature module.
 */
export const router = createBrowserRouter([
  {
    path: ROUTE_PATHS.healthCheck,
    lazy: async () => {
      const { HealthCheckPage } = await import('../features/health');
      return { Component: HealthCheckPage };
    },
  },
]);
