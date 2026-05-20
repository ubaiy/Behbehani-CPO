/**
 * Pure helpers for the /reserve/:listingId screen (Task G1).
 * Extracted from the route file so the route stays under the 500-line cap.
 */

import axios from 'axios';

/** Format ISO timestamp → "21 May 2026, 03:45 PM" (en-KW). */
export function formatExpiresAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-KW', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Pull the locked `error.code` off an AxiosError or fall back to a sentinel.
 * Sentinels: 'unauthenticated' (401), 'network_error' (no response), 'generic'.
 */
export function extractErrorCode(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 401) return 'unauthenticated';
    const code = (err.response?.data as { error?: { code?: string } } | undefined)
      ?.error?.code;
    if (typeof code === 'string' && code.length > 0) return code;
    if (!err.response) return 'network_error';
  }
  return 'generic';
}
