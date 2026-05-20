/**
 * CategoryBreakdown — section wrapper with "CATEGORY BREAKDOWN" label and a list
 * of CategoryCard components.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { slate } from '../../theme/colors';
import { CategoryCard } from './CategoryCard';
import type { Category } from './inspection.types';

interface Props {
  categories: Category[];
}

export function CategoryBreakdown({ categories }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{t('inspection.category.sectionLabel')}</Text>
      {categories.map((cat) => (
        <CategoryCard key={cat.id} category={cat} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginHorizontal: 16, marginTop: 16 },
  sectionLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 11,
    color: slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
});
