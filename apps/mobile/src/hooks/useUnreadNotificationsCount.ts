/**
 * useUnreadNotificationsCount — tiny hook that polls the unread-count endpoint.
 *
 * Task v0.19.a — extracted as a reusable hook so it can be consumed from
 * account hub tile AND (in future) a bottom-tab bar badge.
 *
 * Config:
 *   staleTime:       30 000 ms  (spec §5)
 *   refetchInterval: 60 000 ms  (spec §5 — background polling)
 *
 * Returns undefined while loading; 0 means no unread. Callers should render
 * nothing (not "0") when count === 0.
 */

import { useQuery } from '@tanstack/react-query';
import { meNotificationsApiClient } from '../services/http';

export function useUnreadNotificationsCount(): number | undefined {
  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => meNotificationsApiClient.getUnreadCount(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return data?.count;
}
