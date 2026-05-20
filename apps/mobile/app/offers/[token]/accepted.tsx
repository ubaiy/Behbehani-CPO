/**
 * Offer accepted — terminal success screen.
 * Route: /offers/[token]/accepted
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { brand, slate } from '../../../src/theme/colors';

const BOOKING_REF = 'BMC-CON-001234';
const OFFER_AMOUNT = 'KWD 4,850.000';

export default function OfferAcceptedScreen() {
  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero: checkmark icon + headline ──────────────────────────── */}
      <View style={s.hero}>
        <View style={s.iconCircle}>
          <Text style={s.checkmark}>✓</Text>
        </View>
        <Text style={s.heroTitle}>Offer accepted</Text>
        <Text style={s.heroSub}>
          You sold your car at{' '}
          <Text style={s.heroAmount}>{OFFER_AMOUNT}</Text>
        </Text>
      </View>

      {/* ── Confirmation card ─────────────────────────────────────────── */}
      <View style={s.confirmCard}>
        <Text style={s.confirmText}>
          Behbehani Motors will contact you within 24 hours to schedule pickup.
        </Text>
        <Text style={s.confirmSub}>
          You'll receive a call at your registered number to confirm the next steps.
        </Text>
      </View>

      {/* ── Next steps ───────────────────────────────────────────────── */}
      <View style={s.stepsCard}>
        <Text style={s.stepsLabel}>WHAT HAPPENS NEXT</Text>

        <View style={s.step}>
          <View style={[s.stepNumCircle, s.stepNumActive]}>
            <Text style={[s.stepNum, s.stepNumActiveText]}>1</Text>
          </View>
          <View style={s.stepBody}>
            <Text style={s.stepTitle}>Pickup scheduled</Text>
            <Text style={s.stepDesc}>
              Our team calls to confirm the pickup date and location — no need to bring the car to us.
            </Text>
          </View>
        </View>

        <View style={s.step}>
          <View style={[s.stepNumCircle, s.stepNumIdle]}>
            <Text style={[s.stepNum, s.stepNumIdleText]}>2</Text>
          </View>
          <View style={s.stepBody}>
            <Text style={s.stepTitle}>Vehicle handover</Text>
            <Text style={s.stepDesc}>
              Inspector collects the car and completes the ownership paperwork on the spot.
            </Text>
          </View>
        </View>

        <View style={[s.step, { marginBottom: 0 }]}>
          <View style={[s.stepNumCircle, s.stepNumIdle]}>
            <Text style={[s.stepNum, s.stepNumIdleText]}>3</Text>
          </View>
          <View style={s.stepBody}>
            <Text style={s.stepTitle}>Payment via Otto</Text>
            <Text style={s.stepDesc}>
              {OFFER_AMOUNT} transferred within 2–3 business days after handover.
            </Text>
          </View>
        </View>
      </View>

      {/* ── Booking reference ─────────────────────────────────────────── */}
      <View style={s.refCard}>
        <TouchableOpacity accessibilityLabel={`View booking reference ${BOOKING_REF}`}>
          <Text style={s.refLink}>View booking ref {BOOKING_REF}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Back to account ───────────────────────────────────────────── */}
      <View style={s.footer}>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/account' as any)}
          accessibilityLabel="Back to account"
        >
          <Text style={s.footerLink}>Back to account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  content: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20, paddingBottom: 40,
  },

  // Hero
  hero: { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
  iconCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: brand[50], borderWidth: 2, borderColor: brand[200],
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  checkmark: { color: brand[700], fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold' },
  heroTitle: {
    color: slate[900], fontSize: 24, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center',
  },
  heroSub: { color: slate[600], fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  heroAmount: { color: brand[700], fontFamily: 'PlusJakartaSans_700Bold' },

  // Confirmation card
  confirmCard: {
    marginTop: 20, borderRadius: 16,
    backgroundColor: brand[50], borderWidth: 1, borderColor: brand[200], padding: 20,
  },
  confirmText: { color: brand[900], fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', lineHeight: 20 },
  confirmSub: { color: brand[700], fontSize: 12, marginTop: 8, lineHeight: 18 },

  // Steps card
  stepsCard: {
    marginTop: 20, borderRadius: 16,
    borderWidth: 1, borderColor: slate[200], backgroundColor: '#fff', padding: 20,
  },
  stepsLabel: {
    color: slate[500], fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 1.2, marginBottom: 16,
  },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 20 },
  stepNumCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepNumActive: { backgroundColor: brand[700] },
  stepNumIdle: { backgroundColor: brand[100], borderWidth: 1, borderColor: brand[200] },
  stepNum: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },
  stepNumActiveText: { color: '#fff' },
  stepNumIdleText: { color: brand[700] },
  stepBody: { flex: 1 },
  stepTitle: { color: slate[800], fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' },
  stepDesc: { color: slate[500], fontSize: 12, marginTop: 4, lineHeight: 18 },

  // Booking ref
  refCard: {
    marginTop: 16, borderRadius: 12,
    backgroundColor: slate[50], borderWidth: 1, borderColor: slate[200],
    padding: 16, alignItems: 'center',
  },
  refLink: { color: brand[700], fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', textDecorationLine: 'underline' },

  // Footer
  footer: { marginTop: 24, alignItems: 'center' },
  footerLink: { color: slate[500], fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' },
});
