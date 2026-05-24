/**
 * CategoryBadge — small pill showing the notification category.
 *
 * Maps NotificationCategory enum → localized label via t('notifications.category.*').
 * Brand-only palette: brand-50 background, brand-700 text.
 * Server-supplied category is an enum value; mobile maps it to a label here.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NotificationCategory } from '@behbehani-cpo/shared-types';
import { brand } from '../../theme/colors';

interface Props {
  category: NotificationCategory;
}

export function CategoryBadge({ category }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.pill}>
      <Text style={styles.text} numberOfLines={1}>
        {t(`notifications.category.${category}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: brand[50],
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: brand[700],
    letterSpacing: 0.3,
  },
});
