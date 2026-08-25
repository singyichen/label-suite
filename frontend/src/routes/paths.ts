/**
 * Central route path constants (plan.md `routes/paths.ts`).
 *
 * A single source of truth for path strings means a route rename touches
 * one file instead of every `<Link>`/`navigate()`/route-definition call
 * site scattered across features.
 */
export const ROUTE_PATHS = {
  /** Foundation-only integration probe page (`features/health`). */
  healthCheck: '/health-check',
} as const;
