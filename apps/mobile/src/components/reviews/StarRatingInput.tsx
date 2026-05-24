/**
 * StarRatingInput — 5 tappable stars for the write-review modal.
 *
 * Brand lock (CONCIERGE v1.5-D decision, mirrored from web):
 *   Filled  → brand[700] (#1D4ED8)  — Royal Blue
 *   Empty   → slate[300] (#CBD5E1)
 *   NO yellow / gold stars. Brand-blue is the house standard.
 *
 * Touch targets ≥ 44px per constraint.
 * Controlled component — caller supplies value + onChange.
 */

import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';

interface Props {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
  disabled?: boolean;
}

export function StarRatingInput({ value, onChange, size = 32, disabled = false }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        return (
          <TouchableOpacity
            key={star}
            onPress={disabled ? undefined : () => onChange(star)}
            disabled={disabled}
            style={[styles.starBtn, { width: Math.max(44, size + 8), height: Math.max(44, size + 8) }]}
            accessibilityRole="radio"
            accessibilityState={{ checked: filled, disabled }}
            accessibilityLabel={
              filled
                ? t('reviews.star.filledA11y', { n: star })
                : t('reviews.star.emptyA11y', { n: star })
            }
            accessibilityHint={t('reviews.star.ratingValueA11y', { n: star, total: 5 })}
          >
            <Text
              style={[
                styles.star,
                { fontSize: size, color: filled ? brand[700] : slate[300] },
              ]}
              accessible={false}
            >
              {filled ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    lineHeight: undefined,
  },
});
