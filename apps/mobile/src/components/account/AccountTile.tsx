/**
 * AccountTile — generic 2-col grid tile.
 * Icon + title + subtitle + optional pill.
 * RTL-aware icon row.
 */

import { I18nManager, Pressable, Text, View, StyleSheet } from 'react-native';
import { brand, slate } from '../../theme/colors';

interface Props {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  pill?: React.ReactNode;
  onPress: () => void;
}

export function AccountTile({ icon, title, subtitle, pill, onPress }: Props) {
  const isRTL = I18nManager.isRTL;
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      onPress={onPress}
      android_ripple={{ color: slate[100] }}
      accessibilityRole="button"
    >
      <View style={[styles.iconRow, isRTL && styles.iconRowRTL]}>
        <View style={styles.iconWrap}>{icon}</View>
        {pill && <View>{pill}</View>}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Pressable>
  );
}

/** Count badge — brand-100 bg with brand-700 text. */
export function CountPill({ label }: { label: string }) {
  return (
    <View style={styles.countPill}>
      <Text style={styles.countPillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '47.5%',
    minHeight: 92,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: slate[200],
    borderRadius: 16,
    padding: 16,
    flexDirection: 'column',
  },
  tilePressed: {
    backgroundColor: slate[50],
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  iconRowRTL: {
    flexDirection: 'row-reverse',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700',
    fontSize: 15,
    color: slate[900],
    marginTop: 12,
  },
  subtitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '400',
    fontSize: 11,
    color: slate[500],
    marginTop: 2,
  },
  countPill: {
    backgroundColor: brand[100],
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countPillText: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700',
    fontSize: 9,
    color: brand[700],
  },
});
