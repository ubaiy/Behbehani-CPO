/**
 * CategoryCard — collapsible category row with progress bar + check items.
 * Contains StatusIcon sub-component (pass ✓ in brand[700], fail ✕ in RED_500,
 * advisory slate dot).
 *
 * Red-500 ONLY on failed item icons.
 */

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';
import { RED_500 } from './inspection.types';
import type { Category, ItemStatus } from './inspection.types';

function StatusIcon({ status }: { status: ItemStatus }) {
  if (status === 'pass') {
    return (
      <View style={styles.passIcon}>
        <Text style={styles.passIconText}>✓</Text>
      </View>
    );
  }
  if (status === 'fail') {
    return (
      <View style={styles.failIcon}>
        <Text style={styles.failIconText}>✕</Text>
      </View>
    );
  }
  // advisory — slate dot
  return <View style={styles.advisoryDot} />;
}

interface Props {
  category: Category;
}

export function CategoryCard({ category }: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const progress = category.score / 100;

  return (
    <View style={styles.categoryCard}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.categoryHeader}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={t('inspection.category.itemA11y', { name: category.name, score: category.score })}
        android_ripple={{ color: slate[100] }}
      >
        <View style={styles.categoryIconWrap}>
          <Text style={styles.categoryIconGlyph}>
            {category.id === 'exterior' ? '🚗'
              : category.id === 'mechanical' ? '⚙'
              : category.id === 'electronic' ? '⚡'
              : category.id === 'interior' ? '🪑'
              : '🏁'}
          </Text>
        </View>
        <View style={styles.categoryMeta}>
          <Text style={styles.categoryName}>{category.name}</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
            </View>
            <Text style={styles.categoryScore}>{category.score}/100</Text>
          </View>
        </View>
        <Text style={[styles.chevron, expanded && styles.chevronOpen]}>
          {'›'}
        </Text>
      </Pressable>

      {expanded && (
        <View style={styles.categoryItems}>
          {category.items.map((item, idx) => (
            <View key={idx} style={styles.checkRow}>
              <View style={styles.checkRowLeft}>
                <Text style={styles.checkLabel}>{item.label}</Text>
                {item.note ? (
                  <Text style={styles.checkNote}>{item.note}</Text>
                ) : null}
              </View>
              <StatusIcon status={item.status} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: slate[200],
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    minHeight: 52,
  },
  categoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  categoryIconGlyph: { fontSize: 14 },
  categoryMeta: { flex: 1, minWidth: 0 },
  categoryName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 14,
    color: slate[800],
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: slate[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: brand[600], borderRadius: 3 },
  categoryScore: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 11,
    color: brand[700],
    flexShrink: 0,
  },
  chevron: {
    fontSize: 22,
    color: slate[400],
    flexShrink: 0,
    transform: [{ rotate: '90deg' }],
  },
  chevronOpen: { transform: [{ rotate: '-90deg' }] },
  categoryItems: {
    borderTopWidth: 1,
    borderTopColor: slate[100],
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  checkRowLeft: { flex: 1 },
  checkLabel: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 13,
    color: slate[700],
  },
  checkNote: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 11,
    color: slate[500],
    marginTop: 2,
  },
  passIcon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  passIconText: { fontSize: 14, color: brand[700], fontWeight: '700' },
  failIcon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  failIconText: { fontSize: 14, color: RED_500, fontWeight: '700' },
  advisoryDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: slate[400], marginTop: 6, flexShrink: 0 },
});
