/**
 * BookingRefHero — displays the booking reference with a copy-to-clipboard button.
 *
 * Uses expo-clipboard (already a common dependency). If not available, gracefully
 * falls back to a no-op with a console.warn.
 *
 * Brand-lock: brand-50 background, brand-700 copy icon — no amber/emerald.
 */

import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';

interface Props {
  bookingRef: string;
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    // Dynamic import — graceful if expo-clipboard is absent.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
    const Clipboard = require('expo-clipboard') as {
      setStringAsync(text: string): Promise<void>;
    };
    await Clipboard.setStringAsync(text);
  } catch {
    console.warn('[BookingRefHero] expo-clipboard unavailable — copy skipped');
  }
}

export function BookingRefHero({ bookingRef }: Props) {
  const { t } = useTranslation();

  const handleCopy = async () => {
    await copyToClipboard(bookingRef);
    Alert.alert(
      t('sellTracker.hero.copiedTitle', 'Copied'),
      t('sellTracker.hero.copiedBody', 'Booking reference copied to clipboard.'),
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>
        {t('sellTracker.hero.eyebrow', 'BOOKING REFERENCE')}
      </Text>
      <View style={styles.refRow}>
        <View style={styles.refChip}>
          <Text style={styles.refText}>{bookingRef}</Text>
        </View>
        <TouchableOpacity
          style={styles.copyBtn}
          onPress={() => void handleCopy()}
          accessibilityRole="button"
          accessibilityLabel={t('sellTracker.hero.copyA11y', 'Copy booking reference')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.copyIcon}>⎘</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: brand[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: brand[100],
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  eyebrow: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: brand[700],
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  refChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: brand[200],
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  refText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: slate[900],
    letterSpacing: 1,
  },
  copyBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: brand[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
});
