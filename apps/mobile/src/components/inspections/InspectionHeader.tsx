/**
 * InspectionHeader — sticky top bar with back button, title, share button.
 * Touch targets 44x44 (back/share).
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';

interface Props {
  onBack: () => void;
  onShare: () => void;
}

export function InspectionHeader({ onBack, onShare }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <Pressable
        style={styles.headerBack}
        onPress={onBack}
        accessibilityLabel={t('inspection.header.backA11y')}
        accessibilityRole="button"
      >
        <Text style={styles.headerBackIcon}>{'‹'}</Text>
      </Pressable>
      <Text style={styles.headerTitle}>{t('inspection.header.title')}</Text>
      <Pressable
        style={styles.headerShare}
        onPress={onShare}
        accessibilityLabel={t('inspection.header.shareA11y')}
        accessibilityRole="button"
      >
        <Text style={styles.headerShareIcon}>{'⎋'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: slate[200],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  headerBack: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackIcon: { fontSize: 28, color: slate[700], lineHeight: 36 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 17,
    color: slate[900],
  },
  headerShare: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerShareIcon: { fontSize: 20, color: brand[700] },
});
