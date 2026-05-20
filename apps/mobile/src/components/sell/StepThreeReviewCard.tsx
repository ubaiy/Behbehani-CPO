/**
 * StepThreeReviewCard — review summary rows (Vehicle / Where / When / Contact)
 * with Edit links that navigate back to step 1 or 2.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import { formatDateDisplay, windowLabel } from './dateHelpers';
import type { SellFormState, Step } from './types';

interface StepThreeReviewCardProps {
  form: SellFormState;
  onGoToStep: (s: Step) => void;
}

export function StepThreeReviewCard({ form, onGoToStep }: StepThreeReviewCardProps) {
  const { t } = useTranslation();
  return (
    <View style={ss.card}>
      {/* Vehicle */}
      <View style={ss.reviewRow}>
        <View style={ss.reviewIconBox}><Text style={ss.reviewRowIcon}>🚗</Text></View>
        <View style={ss.reviewMeta}>
          <Text style={ss.reviewRowLabel}>{t('sell.step3.review.vehicleLabel')}</Text>
          <Text style={ss.reviewRowValue} numberOfLines={1}>
            {form.vehicleYear} {form.vehicleBrand} {form.vehicleModel} ·{' '}
            {form.vehicleMileageKm.toLocaleString()} km · Auto · petrol
          </Text>
        </View>
        {/* TODO: link to upstream vehicle entry */}
        <Pressable hitSlop={8}>
          <Text style={ss.editLink}>{t('sell.step3.review.editLink')}</Text>
        </Pressable>
      </View>
      <View style={ss.reviewDivider} />

      {/* Where */}
      <View style={ss.reviewRow}>
        <View style={ss.reviewIconBox}><Text style={ss.reviewRowIcon}>📍</Text></View>
        <View style={ss.reviewMeta}>
          <Text style={ss.reviewRowLabel}>{t('sell.step3.review.whereLabel')}</Text>
          <Text style={ss.reviewRowValue} numberOfLines={2}>
            {form.addressLine || '—'}
          </Text>
        </View>
        <Pressable onPress={() => onGoToStep(1)} hitSlop={8}>
          <Text style={ss.editLink}>{t('sell.step3.review.editLink')}</Text>
        </Pressable>
      </View>
      <View style={ss.reviewDivider} />

      {/* When */}
      <View style={ss.reviewRow}>
        <View style={ss.reviewIconBox}><Text style={ss.reviewRowIcon}>📅</Text></View>
        <View style={ss.reviewMeta}>
          <Text style={ss.reviewRowLabel}>{t('sell.step3.review.whenLabel')}</Text>
          <Text style={ss.reviewRowValue}>
            {formatDateDisplay(form.selectedDate)} · {windowLabel(form.preferredWindow)}
          </Text>
        </View>
        <Pressable onPress={() => onGoToStep(1)} hitSlop={8}>
          <Text style={ss.editLink}>{t('sell.step3.review.editLink')}</Text>
        </Pressable>
      </View>
      <View style={ss.reviewDivider} />

      {/* Contact */}
      <View style={ss.reviewRow}>
        <View style={ss.reviewIconBox}><Text style={ss.reviewRowIcon}>📞</Text></View>
        <View style={ss.reviewMeta}>
          <Text style={ss.reviewRowLabel}>{t('sell.step3.review.contactLabel')}</Text>
          <Text style={ss.reviewRowValue} numberOfLines={2}>
            {form.fullName} · +965 {form.mobile}
            {form.email ? ` · ${form.email}` : ''}
          </Text>
        </View>
        <Pressable onPress={() => onGoToStep(2)} hitSlop={8}>
          <Text style={ss.editLink}>{t('sell.step3.review.editLink')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: slate[200],
    padding: 16,
    gap: 0,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  reviewIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  reviewRowIcon: { fontSize: 18 },
  reviewMeta: { flex: 1, minWidth: 0 },
  reviewRowLabel: {
    fontSize: 10,
    fontFamily: fontFamily.semiBold,
    color: slate[400],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  reviewRowValue: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: slate[900],
    marginTop: 1,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: slate[100],
    marginHorizontal: -4,
  },
  editLink: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: brand[700],
  },
});
