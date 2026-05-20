/**
 * StepOneAddressCard — "Where should we come?" card.
 * Address TextInput, use-current-location pressable, map stub,
 * collapsible parking notes.
 */

import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import type { SellFormState } from './types';

interface StepOneAddressCardProps {
  addressLine: SellFormState['addressLine'];
  parkingNotes: SellFormState['parkingNotes'];
  notesOpen: boolean;
  onAddressChange: (v: string) => void;
  onParkingNotesChange: (v: string) => void;
  onToggleNotes: () => void;
}

export function StepOneAddressCard({
  addressLine,
  parkingNotes,
  notesOpen,
  onAddressChange,
  onParkingNotesChange,
  onToggleNotes,
}: StepOneAddressCardProps) {
  const { t } = useTranslation();
  return (
    <View style={ss.card}>
      <Text style={ss.cardH2}>{t('sell.step1.address.title')}</Text>
      <Text style={ss.cardSub}>{t('sell.step1.address.sub')}</Text>

      <View style={ss.addressRow}>
        <Text style={ss.addressSearchIcon}>⌕</Text>
        <TextInput
          style={ss.addressInput}
          value={addressLine}
          onChangeText={onAddressChange}
          placeholder={t('sell.step1.address.searchPlaceholder')}
          placeholderTextColor={slate[400]}
          returnKeyType="done"
          autoCapitalize="words"
        />
      </View>

      <Pressable
        style={({ pressed }) => [ss.locationBtn, pressed && ss.locationBtnPressed]}
        accessibilityRole="button"
      >
        <Text style={ss.locationBtnIcon}>◎</Text>
        <Text style={ss.locationBtnText}>{t('sell.step1.address.useLocation')}</Text>
      </Pressable>

      {/* Map stub */}
      <View style={ss.mapStub}>
        <View style={ss.mapPin}>
          <Text style={ss.mapPinIcon}>📍</Text>
        </View>
        <Text style={ss.mapCredit}>{t('sell.step1.address.mapCredit')}</Text>
      </View>

      {/* Collapsible parking notes */}
      <Pressable
        style={ss.notesToggle}
        onPress={onToggleNotes}
        accessibilityRole="button"
      >
        <Text style={[ss.notesChevron, { transform: notesOpen ? [{ rotate: '90deg' }] : [] }]}>›</Text>
        <Text style={ss.notesToggleText}>{t('sell.step1.address.parkingToggle')}</Text>
        <Text style={ss.notesOptional}>{t('sell.step1.address.parkingOptional')}</Text>
      </Pressable>
      {notesOpen && (
        <TextInput
          style={ss.parkingTextarea}
          value={parkingNotes ?? ''}
          onChangeText={onParkingNotesChange}
          placeholder={t('sell.step1.address.parkingPlaceholder')}
          placeholderTextColor={slate[400]}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />
      )}
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
    gap: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardH2: {
    fontSize: 16,
    fontFamily: fontFamily.bold,
    color: slate[900],
  },
  cardSub: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: slate[500],
    marginTop: -6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: brand[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    minHeight: 48,
  },
  addressSearchIcon: { color: brand[700], fontSize: 16 },
  addressInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: slate[900],
    minHeight: 28,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: brand[50],
    borderWidth: 1,
    borderColor: brand[200],
  },
  locationBtnPressed: { backgroundColor: brand[100] },
  locationBtnIcon: { fontSize: 16, color: brand[700] },
  locationBtnText: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: brand[700],
  },
  mapStub: {
    height: 120,
    borderRadius: 12,
    backgroundColor: brand[100],
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: slate[200],
  },
  mapPin: { alignItems: 'center' },
  mapPinIcon: { fontSize: 28 },
  mapCredit: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    fontSize: 10,
    fontFamily: fontFamily.regular,
    color: slate[500],
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  notesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    minHeight: 44,
  },
  notesChevron: {
    fontSize: 18,
    color: brand[700],
    fontFamily: fontFamily.bold,
    lineHeight: 22,
  },
  notesToggleText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: brand[700],
  },
  notesOptional: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: slate[400],
  },
  parkingTextarea: {
    backgroundColor: slate[50],
    borderWidth: 1,
    borderColor: slate[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: slate[900],
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
