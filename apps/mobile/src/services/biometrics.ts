/**
 * Biometrics service — wrapper over expo-local-authentication.
 *
 * Capability detection at boot lets the app decide whether to offer Face ID /
 * Touch ID / Android fingerprint or skip directly to PIN/password.
 *
 * The biometric gate is enforced in app/_layout.tsx (W2) on AppState change to
 * 'active' when cpo.auth.biometric_enabled === '1' AND a refresh token exists.
 *
 * Used by: AuthService.requireBiometric() (currently a stub in auth.ts — W2 will
 * replace the stub body with a call to promptBiometric()).
 *
 * iOS: requires NSFaceIDUsageDescription in app.json (already present per §5).
 * Android: no extra permission needed for fingerprint / biometric prompt.
 */

import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricPromptResult = 'success' | 'cancelled' | 'unavailable';

/**
 * Returns true if the device has biometric hardware AND at least one biometric
 * credential enrolled (Face ID enrolled / fingerprint registered).
 *
 * Call at boot to gate the "Enable biometrics" toggle in Account settings.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return isEnrolled;
  } catch {
    // Defensive: capability check must never crash the app.
    return false;
  }
}

/**
 * Prompts the user for biometric authentication.
 *
 * @param reason Human-readable reason shown in the system dialog
 *   (iOS Face ID sheet / Android fingerprint dialog).
 *   Should be a localised string — pass t('auth.biometricPrompt') from the caller.
 *
 * @returns
 *   'success'     — user authenticated successfully; proceed.
 *   'cancelled'   — user dismissed the prompt (tapped Cancel / pressed back);
 *                   caller should offer sign-in fallback.
 *   'unavailable' — hardware missing or no credential enrolled;
 *                   caller should route to sign-in.
 */
export async function promptBiometric(
  reason: string,
): Promise<BiometricPromptResult> {
  const available = await isBiometricAvailable();
  if (!available) return 'unavailable';

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      // iOS: show the passcode fallback after N failed biometric attempts.
      // Android: allow device credential (PIN/pattern) as fallback.
      fallbackLabel: '', // empty string hides the "Enter Password" fallback on iOS
      disableDeviceFallback: false,
      cancelLabel: 'Cancel',
    });

    if (result.success) return 'success';

    // result.error is set when cancelled or failed.
    // 'user_cancel' and 'system_cancel' are cancel actions; anything else is
    // a hardware error (treat as unavailable so the app falls back to sign-in).
    if (result.error === 'user_cancel' || result.error === 'system_cancel') {
      return 'cancelled';
    }

    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}
