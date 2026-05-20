/**
 * Shared QueryClient singleton — closes follow-up #43.
 *
 * Why this exists
 *   Before this module, `http.ts` and `app/_layout.tsx` each constructed their
 *   own `new QueryClient()`. That meant the TOKEN_REUSED forced-sign-out path in
 *   `http.ts` was calling `_queryClient.clear()` on a client that the React tree
 *   was NOT using — so the user's authenticated data stayed in the cache. After
 *   this extraction both modules use the same instance, so `clear()` actually
 *   evicts the queries the UI subscribes to.
 *
 * Cache defaults
 *   Mirrors the prior `_layout.tsx` config (5-min staleTime, exp backoff retry x2)
 *   so behavior is preserved end-to-end. See ARCHITECTURE.md §3 for the cache-key
 *   registry.
 *
 * Persistence
 *   The `asyncStoragePersister` is also exported here so `_layout.tsx` and any
 *   future entry point share the exact same persister key (`cpo.query-cache`).
 *
 * IMPORTANT
 *   Do NOT instantiate a new QueryClient anywhere else in apps/mobile. If you
 *   need access to it outside React, import this singleton.
 */

import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale data is refetched on window focus (app foreground) by default.
      staleTime: 5 * 60 * 1000, // 5 min default; overridden per-query where needed
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    },
  },
});

// AsyncStorage persister — persists the query cache across app restarts.
// Provides offline-first reading (FR-MOB-005) for stale data during no-network sessions.
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'cpo.query-cache',
});
