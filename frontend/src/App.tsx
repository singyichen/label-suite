import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';

import { router } from './routes';
import { queryClient } from './shared/services/query-client';

/**
 * App root: wires the shared TanStack Query client and the central route
 * tree (plan.md `App.tsx`: "QueryClientProvider、router outlet").
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
