/**
 * OrderDetailHeader — sticky white-on-brand header for the detail screen.
 * Mirrors InspectionHeader's pattern: back chevron + title, brand-900 bg.
 */

import { View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand } from '../../theme/colors';

interface Props {
  shortRef: string;
  onBack: () => void;
}

export function OrderDetailHeader({ shortRef, onBack }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backBtn}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={t('orders.header.backA11y')}
      >
        <Text style={styles.backChevron}>‹</Text>
      </TouchableOpacity>
      <View style={styles.titleWrap}>
        <Text style={styles.eyebrow}>{t('orders.header.eyebrow')}</Text>
        <Text style={styles.title} numberOfLines={1}>{shortRef}</Text>
      </View>
      {/* Spacer to keep title centred — symmetric with the back button width. */}
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: brand[900],
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backChevron: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 32,
    transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }],
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  eyebrow: {
    color: '#DBEAFE', // brand-100
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    letterSpacing: 1,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    marginTop: 2,
  },
  spacer: {
    width: 44,
  },
});
