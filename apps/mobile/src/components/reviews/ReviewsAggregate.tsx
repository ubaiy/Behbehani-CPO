/**
 * ReviewsAggregate — average rating + 5-bar histogram + total count.
 *
 * Used at the top of the VDP reviews section.
 * Brand-only colours (no green). Bars use brand[700] fill, slate[200] background.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ReviewRatingHistogram } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../theme/colors';

interface Props {
  averageRating: number;
  total: number;
  histogram: ReviewRatingHistogram;
}

export function ReviewsAggregate({ averageRating, total, histogram }: Props) {
  const { t } = useTranslation();

  if (total === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.noReviewsText}>{t('reviews.aggregate.noReviewsYet')}</Text>
      </View>
    );
  }

  const maxBar = Math.max(
    histogram[1],
    histogram[2],
    histogram[3],
    histogram[4],
    histogram[5],
    1,
  );

  return (
    <View style={styles.container}>
      {/* Left: big average */}
      <View style={styles.left}>
        <Text
          style={styles.avgNumber}
          accessibilityLabel={t('reviews.aggregate.averageRating', {
            rating: averageRating.toFixed(1),
          })}
        >
          {averageRating.toFixed(1)}
        </Text>
        <Text style={styles.avgStars} accessibilityElementsHidden>
          {'★'.repeat(Math.round(averageRating))}
          {'☆'.repeat(5 - Math.round(averageRating))}
        </Text>
        <Text style={styles.totalCount}>
          {t('reviews.aggregate.totalCount', { count: total })}
        </Text>
      </View>

      {/* Right: histogram bars */}
      <View style={styles.right}>
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = histogram[star];
          const pct = count / maxBar;
          return (
            <View
              key={star}
              style={styles.barRow}
              accessibilityLabel={t('reviews.aggregate.ratingDistribution', {
                star,
                count,
              })}
            >
              <Text style={styles.barLabel}>{star}</Text>
              <View style={[styles.barTrack, { flexDirection: 'row' }]}>
                <View
                  style={[
                    styles.barFill,
                    { flexGrow: Math.max(pct, 0), flexShrink: 0 },
                  ]}
                />
                <View style={{ flexGrow: Math.max(1 - pct, 0), flexShrink: 0 }} />
              </View>
              <Text style={styles.barCount}>{count}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
    alignItems: 'center',
  },
  left: {
    alignItems: 'center',
    minWidth: 72,
  },
  avgNumber: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 40,
    color: slate[900],
    lineHeight: 48,
  },
  avgStars: {
    fontSize: 14,
    color: brand[700],
    letterSpacing: 1,
    marginTop: 2,
  },
  totalCount: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: slate[500],
    marginTop: 4,
    textAlign: 'center',
  },
  right: {
    flex: 1,
    gap: 6,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: slate[600],
    width: 12,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: slate[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    backgroundColor: brand[700],
    borderRadius: 4,
  },
  barCount: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: slate[500],
    width: 24,
    textAlign: 'right',
  },
  emptyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  noReviewsText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: slate[500],
  },
});
