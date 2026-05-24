/**
 * SavedSearchListItem — row card in the saved-searches list.
 *
 * Structure:
 *   [name]
 *   [filter summary line]
 *   [Run CTA]  [Delete CTA]
 *
 * Touch targets: row card ≥ 88px, each action button ≥ 44px.
 * Red is used ONLY on the Delete button (destructive).
 * KWD amounts use formatKwd (3-decimal, shared utility).
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { SavedSearchDto } from '@behbehani-cpo/shared-types';
import { brand, slate, red } from '../../theme/colors';
import { formatKwd } from '../orders/orders.utils';

interface Props {
  item: SavedSearchDto;
  onRun: () => void;
  onDelete: () => void;
}

/**
 * Builds a short human-readable summary of the queryPayload.
 * Example: "Sedan · Budget max KWD 4,500.000 · Toyota"
 */
function buildFilterSummary(item: SavedSearchDto): string {
  const { queryPayload } = item;
  const parts: string[] = [];

  if (queryPayload.body_types && queryPayload.body_types.length > 0) {
    parts.push(
      queryPayload.body_types
        .map((b) => b.charAt(0).toUpperCase() + b.slice(1))
        .join(', '),
    );
  }

  if (queryPayload.brands && queryPayload.brands.length > 0) {
    parts.push(
      queryPayload.brands
        .map((b) => b.charAt(0).toUpperCase() + b.slice(1))
        .join(', '),
    );
  }

  if (queryPayload.price_max_fils !== undefined) {
    parts.push(`< ${formatKwd(queryPayload.price_max_fils)}`);
  }

  if (queryPayload.year_min !== undefined || queryPayload.year_max !== undefined) {
    const from = queryPayload.year_min ?? '';
    const to = queryPayload.year_max ?? '';
    parts.push(`${from}–${to}`);
  }

  if (item.matchCountAtCreation !== null && item.matchCountAtCreation !== undefined) {
    parts.push(`${item.matchCountAtCreation} matches`);
  }

  return parts.length > 0 ? parts.join(' · ') : '—';
}

export function SavedSearchListItem({ item, onRun, onDelete }: Props) {
  const { t } = useTranslation();
  const summary = buildFilterSummary(item);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={t('savedSearches.list.itemA11y', { name: item.name })}
    >
      {/* Name */}
      <Text style={styles.name} numberOfLines={1}>
        {item.name}
      </Text>

      {/* Filter summary */}
      <Text style={styles.summary} numberOfLines={2}>
        {summary}
      </Text>

      {/* Action row */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.runBtn}
          onPress={onRun}
          accessibilityRole="button"
          accessibilityLabel={t('savedSearches.item.runBtn')}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Text style={styles.runBtnText}>{t('savedSearches.item.runBtn')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={t('savedSearches.item.deleteA11y', { name: item.name })}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Text style={styles.deleteBtnText}>{t('savedSearches.item.deleteBtn')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 88,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  name: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: slate[900],
  },
  summary: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: slate[500],
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  runBtn: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
    backgroundColor: brand[900],
    paddingHorizontal: 12,
  },
  runBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  deleteBtn: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: red[500],
    paddingHorizontal: 12,
  },
  deleteBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: red[500],
  },
});
