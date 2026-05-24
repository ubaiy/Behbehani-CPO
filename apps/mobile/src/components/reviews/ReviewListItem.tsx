/**
 * ReviewListItem — single review row card.
 *
 * Used on:
 *   • /reviews list (my-reviews mode — shows delete action)
 *   • VDP listing inline (no delete action)
 *
 * Props:
 *   review         ReviewDto
 *   onDelete?      When provided, renders a Delete button (my-reviews mode).
 *   showTarget?    Show target-kind icon + label (my-reviews mode needs this context).
 *
 * Touch target ≥ 44px on the delete button.
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ReviewDto } from '@behbehani-cpo/shared-types';
import { brand, slate, red } from '../../theme/colors';

interface Props {
  review: ReviewDto;
  onDelete?: () => void;
  showTarget?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}yr ago`;
  } catch {
    return '';
  }
}

function starRow(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

// ─── Target label ─────────────────────────────────────────────────────────────

function TargetChip({ review }: { review: ReviewDto }) {
  const { t } = useTranslation();
  if (review.target.kind === 'listing') {
    return (
      <View style={chipStyles.chip}>
        <Text style={chipStyles.icon} accessibilityElementsHidden>{'🚗'}</Text>
        <Text style={chipStyles.label} numberOfLines={1}>
          {t('reviews.target.listing')}
        </Text>
      </View>
    );
  }
  const kind = review.target.serviceKind;
  const labelKey =
    kind === 'inspection'
      ? 'reviews.target.serviceInspection'
      : 'reviews.target.serviceMaintenance';
  const icon = kind === 'inspection' ? '📋' : '🔧';
  return (
    <View style={chipStyles.chip}>
      <Text style={chipStyles.icon} accessibilityElementsHidden>{icon}</Text>
      <Text style={chipStyles.label} numberOfLines={1}>
        {t(labelKey)}
      </Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: brand[50],
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  icon: { fontSize: 13 },
  label: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: brand[700],
  },
});

// ─── Component ────────────────────────────────────────────────────────────────

export function ReviewListItem({ review, onDelete, showTarget = false }: Props) {
  const { t } = useTranslation();

  const displayName =
    review.customerDisplayName.trim() || t('reviews.customerNameAnonymous');
  const dateLabel = relativeDate(review.createdAt);

  return (
    <View
      style={styles.card}
      accessibilityLabel={t('reviews.list.itemA11y', {
        name: displayName,
        rating: review.rating,
      })}
    >
      {showTarget ? <TargetChip review={review} /> : null}

      {/* Header: name + date + delete */}
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <View style={styles.headerRight}>
          <Text style={styles.date}>{dateLabel}</Text>
          {onDelete ? (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={onDelete}
              accessibilityRole="button"
              accessibilityLabel={t('reviews.delete.confirm')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteBtnText}>{t('reviews.delete.confirm')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Stars */}
      <Text style={styles.stars} accessibilityLabel={t('reviews.star.ratingValueA11y', { n: review.rating, total: 5 })}>
        {starRow(review.rating)}
      </Text>

      {/* Title */}
      {review.title ? (
        <Text style={styles.title} numberOfLines={2}>
          {review.title}
        </Text>
      ) : null}

      {/* Body preview — 2 lines */}
      {review.body ? (
        <Text style={styles.body} numberOfLines={2}>
          {review.body}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: slate[900],
    flex: 1,
  },
  date: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: slate[400],
  },
  deleteBtn: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  deleteBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: red[500],
  },
  stars: {
    fontSize: 16,
    color: brand[700],
    letterSpacing: 1,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: slate[900],
  },
  body: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: slate[600],
    lineHeight: 18,
  },
});
