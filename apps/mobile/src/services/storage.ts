/**
 * Typed wrapper around expo-secure-store.
 *
 * All values are stored as strings (SecureStore only supports strings).
 * Callers are responsible for JSON serialisation of complex values.
 *
 * SecureStore is encrypted at rest on both iOS (Keychain) and Android
 * (EncryptedSharedPreferences / Keystore). It is NOT accessible to other
 * apps or backed up to iCloud/Google Backup by default.
 *
 * Size limit: 2048 bytes per value. Store large blobs elsewhere (AsyncStorage).
 *
 * ── Per-key requireAuthentication override ─────────────────────────────────
 *
 * Threat model decision (ARCHITECTURE.md §5):
 *   The refresh token has a 30-day TTL and is the credential that unlocks a
 *   new access token without re-authentication. If an attacker gains physical
 *   access to an unlocked device, they can extract SecureStore values that do
 *   NOT require authentication.
 *
 *   We apply `requireAuthentication: true` to the REFRESH TOKEN only.
 *   This maps to:
 *     iOS:     kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly + biometric/passcode prompt
 *     Android: BIOMETRIC_STRONG | DEVICE_CREDENTIAL
 *
 *   The access token (15-min TTL) uses the default policy — it expires quickly
 *   enough that the extra prompt on each read would degrade UX without meaningful
 *   security gain.
 *
 *   The cached PublicUser JSON is stored in AsyncStorage (non-sensitive, already
 *   accessible without SecureStore unlock — role is 'customer' only on mobile).
 */

import * as SecureStore from 'expo-secure-store';

export interface TypedStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Keys that require biometric/passcode authentication before reading.
// This is additive — new high-value keys should be added here.
const REQUIRE_AUTH_KEYS = new Set([
  'auth.refreshToken',
  'cpo.auth.refresh', // architecture §5 canonical key name
]);

function optionsFor(key: string): SecureStore.SecureStoreOptions {
  return {
    requireAuthentication: REQUIRE_AUTH_KEYS.has(key),
  };
}

/**
 * Retrieves a stored string value.
 * Returns null if the key does not exist or SecureStore is unavailable.
 */
async function getItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key, optionsFor(key));
  } catch {
    // SecureStore can fail on simulators or when the device is not yet
    // unlocked. Return null rather than crashing the app.
    return null;
  }
}

/**
 * Stores a string value under the given key.
 * Silently drops the write if SecureStore is unavailable (e.g. simulator
 * without keychain configured) — the app degrades gracefully.
 */
async function setItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value, optionsFor(key));
  } catch {
    // Non-fatal: the session will simply not persist across restarts.
  }
}

/**
 * Removes the value stored under the given key.
 * No-ops if the key does not exist.
 */
async function removeItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key, optionsFor(key));
  } catch {
    // No-op — key already absent or store unavailable.
  }
}

export const storage: TypedStorage = {
  getItem,
  setItem,
  removeItem,
};
