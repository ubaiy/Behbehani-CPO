/**
 * Sell tab — Concierge booking wizard (3-step state machine)
 * Sprint M2 re-alignment. Mirrors: mockups/mobile/sprint-M2/08-sell-yourcar.html
 *
 * Steps:
 *   1 — Where + When  (address / date strip / time window)
 *   2 — Contact       (name / mobile / email)
 *   3 — Review        (summary + T&Cs + book CTA)
 *
 * No expo-router push between steps — single screen, internal useState machine.
 * Tab bar is provided by the parent (tabs) layout; not rendered here.
 *
 * TODO W3: wire Book CTA to inspectionsPublicClient.createBooking(formData)
 * TODO: vehicle entry is upstream — hardcoded defaults used for now
 */

import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  I18nManager,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { slate } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/theme';
import { DATE_CARDS } from '../../src/components/sell/dateHelpers';
import {
  SellHero,
  VehiclePreviewCard,
  StepOneAddressCard,
  StepOneScheduleCard,
  StepTwoContactCard,
  StepThreeReviewCard,
  WhatHappensNextCard,
  StepFooter,
  BookConfirmationToast,
} from '../../src/components/sell';
import type { Step, SellFormState } from '../../src/components/sell';

// ─── Main Screen (orchestrator) ───────────────────────────────────────────────

export default function SellScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState<Step>(1);
  const [notesOpen, setNotesOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bookingRef] = useState('BMC-CON-001234');

  const today = DATE_CARDS[0].iso;
  const [form, setForm] = useState<SellFormState>({
    vehicleYear: 2021,
    vehicleBrand: 'Toyota',
    vehicleModel: 'Camry',
    vehicleVin: undefined,
    vehicleMileageKm: 42000,
    vehicleTransmission: 'automatic',
    addressLine: '',
    governorate: undefined,
    parkingNotes: undefined,
    selectedDate: today,
    preferredWindow: 'afternoon',
    fullName: '',
    mobile: '',
    email: '',
    agreedToTerms: false,
  });

  function patch<K extends keyof SellFormState>(key: K, value: SellFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const goToStep = useCallback((s: Step) => {
    setStep(s);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  function handleBackPress() {
    if (step === 1) {
      router.back();
    } else {
      goToStep((step - 1) as Step);
    }
  }

  function handleStep1Continue() {
    if (!form.addressLine.trim()) {
      Alert.alert(t('sell.alerts.addressRequiredTitle'), t('sell.alerts.addressRequiredBody'));
      return;
    }
    goToStep(2);
  }

  function handleStep2Continue() {
    if (!form.fullName.trim()) {
      Alert.alert(t('sell.alerts.nameRequiredTitle'), t('sell.alerts.nameRequiredBody'));
      return;
    }
    if (!/^[569][0-9]{7}$/.test(form.mobile)) {
      Alert.alert(t('sell.alerts.invalidMobileTitle'), t('sell.alerts.invalidMobileBody'));
      return;
    }
    goToStep(3);
  }

  function handleBook() {
    if (!form.agreedToTerms) {
      Alert.alert(t('sell.alerts.termsRequiredTitle'), t('sell.alerts.termsRequiredBody'));
      return;
    }
    // TODO W3: wire to real submit via inspectionsPublicClient.createBooking(form)
    setSubmitted(true);
  }

  const isRTL = I18nManager.isRTL;

  // ── Step renders ────────────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <>
        <StepOneAddressCard
          addressLine={form.addressLine}
          parkingNotes={form.parkingNotes}
          notesOpen={notesOpen}
          onAddressChange={(v) => patch('addressLine', v)}
          onParkingNotesChange={(v) => patch('parkingNotes', v)}
          onToggleNotes={() => setNotesOpen((o) => !o)}
        />
        <StepOneScheduleCard
          selectedDate={form.selectedDate}
          preferredWindow={form.preferredWindow}
          onDateChange={(iso) => patch('selectedDate', iso)}
          onWindowChange={(w) => patch('preferredWindow', w)}
        />
        <StepFooter
          step={1}
          primaryLabel={t('sell.step1.cta')}
          onPrimary={handleStep1Continue}
        />
      </>
    );
  }

  function renderStep2() {
    return (
      <>
        <StepTwoContactCard
          fullName={form.fullName}
          mobile={form.mobile}
          email={form.email}
          onFullNameChange={(v) => patch('fullName', v)}
          onMobileChange={(v) => patch('mobile', v)}
          onEmailChange={(v) => patch('email', v)}
        />
        <StepFooter
          step={2}
          primaryLabel={t('sell.step2.cta')}
          onPrimary={handleStep2Continue}
          onBack={() => goToStep(1)}
        />
      </>
    );
  }

  function renderStep3() {
    if (submitted) {
      return <BookConfirmationToast bookingRef={bookingRef} />;
    }

    return (
      <>
        <StepThreeReviewCard form={form} onGoToStep={goToStep} />
        <WhatHappensNextCard />

        {/* T&Cs checkbox */}
        <Pressable
          style={ss.termsRow}
          onPress={() => patch('agreedToTerms', !form.agreedToTerms)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: form.agreedToTerms }}
        >
          <View style={[ss.checkbox, form.agreedToTerms && ss.checkboxChecked]}>
            {form.agreedToTerms && <Text style={ss.checkboxMark}>✓</Text>}
          </View>
          <Text style={ss.termsText}>{t('sell.step3.terms')}</Text>
        </Pressable>

        <StepFooter
          step={3}
          primaryLabel={t('sell.step3.review.confirmBtn')}
          onPrimary={handleBook}
          onBack={() => goToStep(2)}
        />
      </>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={ss.safeArea}>
      <KeyboardAvoidingView
        style={ss.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={ss.flex}
          contentContainerStyle={ss.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SellHero step={step} isRTL={isRTL} onBack={handleBackPress} onGoToStep={goToStep} />
          <VehiclePreviewCard form={form} />

          <View style={ss.stepContent}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Orchestrator-only styles (T&Cs checkbox lives here) ─────────────────────

const ss = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  stepContent: { paddingHorizontal: 16, gap: 12, marginTop: 0 },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: slate[50],
    minHeight: 44,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: slate[300],
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  checkboxMark: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: fontFamily.bold,
    lineHeight: 14,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: slate[700],
    lineHeight: 18,
  },
});
