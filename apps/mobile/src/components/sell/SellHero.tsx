/**
 * SellHero — brand-gradient hero with eyebrow pill, h1/subline,
 * horizontal trust strip (step 1 only), and 3-step stepper.
 */

import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { brand } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import type { Step } from './types';

// ─── Internal sub-components ──────────────────────────────────────────────────

function StepBadge({ num, active, done }: { num: 1 | 2 | 3; active: boolean; done: boolean }) {
  if (done) {
    return (
      <View style={[ss.stepBadge, ss.stepBadgeDone]}>
        <Text style={ss.stepBadgeCheck}>✓</Text>
      </View>
    );
  }
  return (
    <View style={[ss.stepBadge, active ? ss.stepBadgeActive : ss.stepBadgeFuture]}>
      <Text style={[ss.stepBadgeNum, active ? ss.stepBadgeNumActive : ss.stepBadgeNumFuture]}>
        {num}
      </Text>
    </View>
  );
}

function StepPill({
  num,
  label,
  active,
  done,
}: {
  num: 1 | 2 | 3;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <View style={[ss.stepPill, active ? ss.stepPillActive : ss.stepPillFuture]}>
      <StepBadge num={num} active={active} done={done} />
      <Text
        style={[ss.stepPillLabel, active ? ss.stepPillLabelActive : ss.stepPillLabelFuture]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SellHeroProps {
  step: Step;
  isRTL: boolean;
  onBack: () => void;
  onGoToStep: (s: Step) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SellHero({ step, isRTL, onBack, onGoToStep }: SellHeroProps) {
  const chevronFlip = isRTL ? [] : [{ scaleX: -1 }];

  return (
    <View style={ss.hero}>
      {/* Back row + eyebrow (step 1) or back label (steps 2-3) */}
      <View style={ss.heroTopRow}>
        <Pressable
          style={ss.backBtn}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <Text style={[ss.backChevron, { transform: isRTL ? [] : chevronFlip }]}>‹</Text>
        </Pressable>

        {step === 1 ? (
          <View style={ss.eyebrowPill}>
            <Text style={ss.eyebrowText}>Concierge service</Text>
          </View>
        ) : (
          <Pressable onPress={() => onGoToStep((step - 1) as Step)} hitSlop={6}>
            <Text style={ss.backLabel}>
              {step === 2 ? '← Back to Where + When' : '← Back to Contact'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Title + subline */}
      <Text style={ss.heroH1}>
        {step === 3 ? 'One last check' : 'Schedule your inspection'}
      </Text>
      {step !== 2 && (
        <Text style={ss.heroSub}>
          {step === 1
            ? "Three minutes. We'll come to you within 24 hours."
            : "Make sure everything looks right, then we'll send your inspector."}
        </Text>
      )}

      {/* Trust strip (step 1 only) */}
      {step === 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={ss.trustStrip}
          contentContainerStyle={ss.trustStripContent}
        >
          {['Completely free', '71-point inspection at your door', 'Guaranteed cash offer in 24h'].map(
            (label) => (
              <View key={label} style={ss.trustPill}>
                <Text style={ss.trustCheck}>✓</Text>
                <Text style={ss.trustPillText}>{label}</Text>
              </View>
            ),
          )}
        </ScrollView>
      )}

      {/* Step counter + stepper */}
      <View style={ss.stepperWrap}>
        <Text style={ss.stepCounter}>Step {step} of 3</Text>
        <View style={ss.stepperRow}>
          <StepPill num={1} label="Where + When" active={step === 1} done={step > 1} />
          <StepPill num={2} label="Contact" active={step === 2} done={step > 2} />
          <StepPill num={3} label="Review" active={step === 3} done={false} />
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  hero: {
    backgroundColor: brand[900],
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: {
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 32,
    marginLeft: -2,
  },
  backLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
  },
  eyebrowPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  eyebrowText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: fontFamily.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroH1: {
    color: '#ffffff',
    fontSize: 22,
    fontFamily: fontFamily.bold,
    lineHeight: 28,
    marginBottom: 4,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontFamily: fontFamily.regular,
    lineHeight: 20,
    marginBottom: 8,
  },
  trustStrip: { marginTop: 8 },
  trustStripContent: { gap: 8, paddingBottom: 4 },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  trustCheck: {
    color: brand[300],
    fontSize: 12,
    fontFamily: fontFamily.bold,
  },
  trustPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
  },
  stepperWrap: { marginTop: 14 },
  stepCounter: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
    marginBottom: 8,
  },
  stepperRow: { flexDirection: 'row', gap: 6 },
  stepPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  stepPillActive: { backgroundColor: '#ffffff' },
  stepPillFuture: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  stepPillLabel: { fontSize: 11, fontFamily: fontFamily.semiBold, flex: 1 },
  stepPillLabelActive: { color: brand[700] },
  stepPillLabelFuture: { color: '#ffffff' },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepBadgeActive: { backgroundColor: brand[700] },
  stepBadgeFuture: { backgroundColor: 'rgba(255,255,255,0.20)' },
  stepBadgeDone: { backgroundColor: 'rgba(255,255,255,0.20)' },
  stepBadgeNum: { fontSize: 10, fontFamily: fontFamily.bold },
  stepBadgeNumActive: { color: '#ffffff' },
  stepBadgeNumFuture: { color: '#ffffff' },
  stepBadgeCheck: { color: '#ffffff', fontSize: 10, fontFamily: fontFamily.bold },
});
