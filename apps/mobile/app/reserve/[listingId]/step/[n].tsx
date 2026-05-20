/**
 * Reserve step redirect — /reserve/:listingId/step/:n
 *
 * DEPRECATED (Task G1, v1.4 Day 8+ mobile catch-up):
 *
 * The original 3-step wizard scaffold was collapsed into a single modal-style
 * screen at /reserve/:listingId that mirrors A's web checkout-modal pattern
 * (v1.4.11 §). This file is preserved only because the sandboxed environment
 * does not allow directory deletion; functionally it is a one-shot redirect
 * back to the canonical reserve route.
 *
 * Any deep link or stale navigation that hits this route is immediately
 * router.replace()'d to /reserve/:listingId so the user lands on the real
 * payment-method picker without ever seeing a flash of stub UI.
 *
 * TODO (cleanup): once a follow-up task runs outside the sandbox, delete
 * the parent directory `app/reserve/[listingId]/` in its entirety.
 */

import { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

export default function ReserveStepRedirect() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();

  useEffect(() => {
    if (typeof listingId === 'string' && listingId.length > 0) {
      router.replace(
        `/reserve/${listingId}` as Parameters<typeof router.replace>[0],
      );
    } else {
      router.replace('/(tabs)' as Parameters<typeof router.replace>[0]);
    }
  }, [listingId]);

  return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
}
