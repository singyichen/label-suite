/**
 * Central TanStack Query `queryKey` factory (SC-019).
 *
 * `useQuery`/`useMutation`/`useInfiniteQuery` calls must reference keys
 * from here rather than inline string arrays, so cache invalidation stays
 * consistent across features as new modules add their own key namespaces.
 */
export const QUERY_KEYS = {
  health: {
    status: ['health', 'status'] as const,
  },
} as const;
