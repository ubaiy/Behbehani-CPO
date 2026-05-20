import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamily, radius, spacing } from '../../theme/theme';
import { brand, slate } from '../../theme/colors';
import { railStyles } from './ListingRail';

const HOW_IT_WORKS = [
  { step: '1', titleKey: 'home.howStep1Title', bodyKey: 'home.howStep1Body' },
  { step: '2', titleKey: 'home.howStep2Title', bodyKey: 'home.howStep2Body' },
  { step: '3', titleKey: 'home.howStep3Title', bodyKey: 'home.howStep3Body' },
];

export function HowItWorksSection() {
  const { t } = useTranslation();
  return (
    <View style={howStyles.section}>
      <Text style={railStyles.title}>{t('home.howItWorksTitle')}</Text>
      {HOW_IT_WORKS.map((step) => (
        <View key={step.step} style={howStyles.row}>
          <View style={howStyles.stepCircle}>
            <Text style={howStyles.stepNum}>{step.step}</Text>
          </View>
          <View style={howStyles.stepBody}>
            <Text style={howStyles.stepTitle}>{t(step.titleKey)}</Text>
            <Text style={howStyles.stepDesc}>{t(step.bodyKey)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const howStyles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing[4],
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginTop: spacing[2] + 2,
    backgroundColor: slate[50],
    borderWidth: 1,
    borderColor: slate[200],
    borderRadius: radius['2xl'],
    padding: spacing[3],
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brand[900],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNum: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: slate[900],
    marginBottom: 3,
  },
  stepDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: slate[500],
    lineHeight: 16,
  },
});
