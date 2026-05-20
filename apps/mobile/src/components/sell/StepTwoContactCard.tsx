/**
 * StepTwoContactCard — "Who should we contact?" card.
 * Full name / +965 KW mobile chip + 8-digit input / email + privacy card.
 */

import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import type { SellFormState } from './types';

interface StepTwoContactCardProps {
  fullName: SellFormState['fullName'];
  mobile: SellFormState['mobile'];
  email: SellFormState['email'];
  onFullNameChange: (v: string) => void;
  onMobileChange: (v: string) => void;
  onEmailChange: (v: string) => void;
}

export function StepTwoContactCard({
  fullName,
  mobile,
  email,
  onFullNameChange,
  onMobileChange,
  onEmailChange,
}: StepTwoContactCardProps) {
  const { t } = useTranslation();
  return (
    <View style={ss.card}>
      <Text style={ss.cardH2}>{t('sell.step2.contact.title')}</Text>

      {/* Full name */}
      <View style={ss.fieldBlock}>
        <Text style={ss.fieldLabel}>
          {t('sell.step2.contact.nameLabel')} <Text style={ss.requiredMark}>*</Text>
        </Text>
        <TextInput
          style={ss.input}
          value={fullName}
          onChangeText={onFullNameChange}
          placeholder={t('sell.step2.contact.namePlaceholder')}
          placeholderTextColor={slate[400]}
          autoCapitalize="words"
          returnKeyType="next"
        />
      </View>

      {/* Mobile — KW +965 prefix, 8-digit input */}
      <View style={ss.fieldBlock}>
        <Text style={ss.fieldLabel}>
          {t('sell.step2.contact.mobileLabel')} <Text style={ss.requiredMark}>*</Text>
        </Text>
        <View style={ss.mobileRow}>
          <View style={ss.mobilePrefix}>
            <Text style={ss.mobilePrefixText}>+965</Text>
          </View>
          <TextInput
            style={[ss.input, ss.mobileInput]}
            value={mobile}
            onChangeText={(v) => onMobileChange(v.replace(/[^0-9]/g, '').slice(0, 8))}
            placeholder="5XXX XXXX"
            placeholderTextColor={slate[400]}
            inputMode="tel"
            keyboardType="number-pad"
            maxLength={8}
            returnKeyType="next"
          />
        </View>
        <Text style={ss.fieldHint}>{t('sell.step2.contact.mobileHint')}</Text>
      </View>

      {/* Email (optional) */}
      <View style={ss.fieldBlock}>
        <Text style={ss.fieldLabel}>
          {t('sell.step2.contact.emailLabel')}{' '}
          <Text style={ss.optionalHint}>{t('sell.step2.contact.emailOptional')}</Text>
        </Text>
        <TextInput
          style={ss.input}
          value={email}
          onChangeText={onEmailChange}
          placeholder={t('sell.step2.contact.emailPlaceholder')}
          placeholderTextColor={slate[400]}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
      </View>

      {/* Privacy reassurance */}
      <View style={ss.privacyCard}>
        <Text style={ss.privacyIcon}>🛡</Text>
        <Text style={ss.privacyText}>{t('sell.step2.contact.privacyText')}</Text>
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
  fieldBlock: { gap: 4 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: slate[700],
  },
  requiredMark: { color: '#DC2626' },
  optionalHint: {
    fontFamily: fontFamily.regular,
    color: slate[400],
    fontSize: 11,
  },
  fieldHint: {
    fontSize: 10,
    fontFamily: fontFamily.regular,
    color: slate[500],
  },
  input: {
    height: 48,
    minHeight: 44,
    backgroundColor: slate[50],
    borderWidth: 1,
    borderColor: slate[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: slate[900],
  },
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobilePrefix: {
    height: 48,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: slate[100],
    borderWidth: 1,
    borderColor: slate[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobilePrefixText: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
    color: slate[500],
  },
  mobileInput: { flex: 1 },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: slate[50],
    borderWidth: 1,
    borderColor: slate[200],
    borderRadius: 12,
    padding: 12,
  },
  privacyIcon: { fontSize: 16, marginTop: 1 },
  privacyText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: slate[700],
    lineHeight: 18,
  },
});
