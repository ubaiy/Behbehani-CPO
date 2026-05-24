/**
 * MaintenanceForm — reusable create/edit form for maintenance pickup requests.
 *
 * Extracts the form UI out of /maintenance/new so it can also be used in a
 * future /maintenance/[id]/edit screen without duplication.
 *
 * Governorate wire values are snake_case per B's Prisma enum:
 *   capital | hawalli | ahmadi | jahra | farwaniya | mubarak_al_kabeer
 * Display labels via t('maintenance.governorate.<snake_case_key>').
 *
 * Date picker: a 7-day horizontal date strip (same pattern as sell-flow)
 * so no third-party date-picker library is needed.
 *
 * Concern notes: 500 char limit with live counter.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type {
  CreateMaintenanceRequestInput,
  MaintenanceConcernCategory,
  MaintenancePreferredWindow,
} from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../theme/colors';

// KuwaitGovernorate — snake_case wire values per B's Prisma enum.
// Note: mubarak_al_kabeer is snake_case (NOT mubarakAlKabeer).
type KuwaitGovernorate =
  | 'capital'
  | 'hawalli'
  | 'ahmadi'
  | 'jahra'
  | 'farwaniya'
  | 'mubarak_al_kabeer';

// ─── Constants ────────────────────────────────────────────────────────────────

const GOVERNORATES: KuwaitGovernorate[] = [
  'capital',
  'hawalli',
  'ahmadi',
  'jahra',
  'farwaniya',
  'mubarak_al_kabeer',
];

const WINDOWS: MaintenancePreferredWindow[] = ['morning', 'afternoon', 'evening'];

const CATEGORIES: MaintenanceConcernCategory[] = [
  'oil_change',
  'brakes',
  'tires',
  'electrical',
  'engine',
  'other',
];

const CONCERN_NOTES_MAX = 500;

// ─── Date helpers ─────────────────────────────────────────────────────────────

interface DateCard {
  iso: string;
  dayAbbr: string;
  dayNum: string;
  month: string;
}

function buildDateCards(count = 14): DateCard[] {
  const cards: DateCard[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const dayAbbr = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = String(d.getDate());
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    cards.push({ iso, dayAbbr, dayNum, month });
  }
  return cards;
}

const DATE_CARDS = buildDateCards(14);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MaintenanceFormValues {
  vehicleFreeText: string;
  governorate: KuwaitGovernorate | null;
  pickupAddressLine: string;
  preferredDate: string; // YYYY-MM-DD
  preferredWindow: MaintenancePreferredWindow | null;
  concernCategory: MaintenanceConcernCategory | null;
  concernNotes: string;
}

interface Props {
  initialValues?: Partial<MaintenanceFormValues>;
  isSubmitting: boolean;
  onSubmit: (input: CreateMaintenanceRequestInput) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MaintenanceForm({ initialValues, isSubmitting, onSubmit }: Props) {
  const { t } = useTranslation();

  const [vehicleFreeText, setVehicleFreeText] = useState(
    initialValues?.vehicleFreeText ?? '',
  );
  const [governorate, setGovernorate] = useState<KuwaitGovernorate | null>(
    initialValues?.governorate ?? null,
  );
  const [pickupAddressLine, setPickupAddressLine] = useState(
    initialValues?.pickupAddressLine ?? '',
  );
  const [preferredDate, setPreferredDate] = useState(
    initialValues?.preferredDate ?? DATE_CARDS[0]?.iso ?? '',
  );
  const [preferredWindow, setPreferredWindow] =
    useState<MaintenancePreferredWindow | null>(
      initialValues?.preferredWindow ?? null,
    );
  const [concernCategory, setConcernCategory] =
    useState<MaintenanceConcernCategory | null>(
      initialValues?.concernCategory ?? null,
    );
  const [concernNotes, setConcernNotes] = useState(
    initialValues?.concernNotes ?? '',
  );

  // ─── Validation + submit ───────────────────────────────────────────────────

  function handleSubmit() {
    if (!vehicleFreeText.trim()) {
      Alert.alert(t('maintenance.form.vehicleLabel'), t('maintenance.form.vehiclePlaceholder'));
      return;
    }
    if (!governorate) {
      Alert.alert(t('maintenance.form.governorateLabel'));
      return;
    }
    if (!pickupAddressLine.trim()) {
      Alert.alert(t('maintenance.form.pickupAddressLabel'));
      return;
    }
    if (!preferredWindow) {
      Alert.alert(t('maintenance.form.preferredWindowLabel'));
      return;
    }
    if (!concernCategory) {
      Alert.alert(t('maintenance.form.concernCategoryLabel'));
      return;
    }
    if (!concernNotes.trim()) {
      Alert.alert(t('maintenance.form.concernNotesLabel'));
      return;
    }

    const input: CreateMaintenanceRequestInput = {
      vehicleFreeText: vehicleFreeText.trim(),
      governorate,
      pickupAddressLine: pickupAddressLine.trim(),
      preferredDate,
      preferredWindow,
      concernCategory,
      concernNotes: concernNotes.trim(),
    };
    onSubmit(input);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Vehicle free-text */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t('maintenance.form.vehicleLabel')}</Text>
        <TextInput
          style={styles.input}
          value={vehicleFreeText}
          onChangeText={setVehicleFreeText}
          placeholder={t('maintenance.form.vehiclePlaceholder')}
          placeholderTextColor={slate[400]}
          autoCapitalize="words"
          returnKeyType="next"
        />
      </View>

      {/* Governorate chip picker — send snake_case wire value */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t('maintenance.form.governorateLabel')}</Text>
        <View style={styles.chipGrid}>
          {GOVERNORATES.map((gov) => {
            const isSelected = governorate === gov;
            return (
              <TouchableOpacity
                key={gov}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setGovernorate(gov)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
              >
                <Text
                  style={[styles.chipText, isSelected && styles.chipTextSelected]}
                >
                  {t(`maintenance.governorate.${gov}`, { defaultValue: gov })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Pickup address */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t('maintenance.form.pickupAddressLabel')}</Text>
        <TextInput
          style={styles.input}
          value={pickupAddressLine}
          onChangeText={setPickupAddressLine}
          placeholder={t('maintenance.form.pickupAddressPlaceholder')}
          placeholderTextColor={slate[400]}
          autoCapitalize="sentences"
          returnKeyType="next"
        />
      </View>

      {/* Preferred date — 14-day horizontal strip (sell-flow pattern) */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t('maintenance.form.preferredDateLabel')}</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={DATE_CARDS}
          keyExtractor={(item) => item.iso}
          style={styles.dateStrip}
          contentContainerStyle={styles.dateStripContent}
          renderItem={({ item }) => {
            const isSelected = preferredDate === item.iso;
            return (
              <TouchableOpacity
                style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                onPress={() => setPreferredDate(item.iso)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
              >
                <Text style={[styles.dateDayAbbr, isSelected && styles.dateDayAbbrSelected]}>
                  {item.dayAbbr}
                </Text>
                <Text style={[styles.dateDayNum, isSelected && styles.dateDayNumSelected]}>
                  {item.dayNum}
                </Text>
                <Text style={[styles.dateMonth, isSelected && styles.dateMonthSelected]}>
                  {item.month}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Preferred window chips */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t('maintenance.form.preferredWindowLabel')}</Text>
        <View style={styles.chipRow}>
          {WINDOWS.map((w) => {
            const isSelected = preferredWindow === w;
            return (
              <TouchableOpacity
                key={w}
                style={[styles.chip, styles.chipFlex, isSelected && styles.chipSelected]}
                onPress={() => setPreferredWindow(w)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
              >
                <Text
                  style={[styles.chipText, isSelected && styles.chipTextSelected]}
                >
                  {t(`maintenance.window.${w}`, { defaultValue: w })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Concern category chips */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t('maintenance.form.concernCategoryLabel')}</Text>
        <View style={styles.chipGrid}>
          {CATEGORIES.map((cat) => {
            const isSelected = concernCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setConcernCategory(cat)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
              >
                <Text
                  style={[styles.chipText, isSelected && styles.chipTextSelected]}
                >
                  {t(`maintenance.concern.${cat}`, { defaultValue: cat })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Concern notes */}
      <View style={styles.fieldGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{t('maintenance.form.concernNotesLabel')}</Text>
          <Text style={styles.charCount}>
            {t('maintenance.form.charsRemaining', {
              count: CONCERN_NOTES_MAX - concernNotes.length,
            })}
          </Text>
        </View>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={concernNotes}
          onChangeText={(v) => setConcernNotes(v.slice(0, CONCERN_NOTES_MAX))}
          placeholder={t('maintenance.form.concernNotesPlaceholder')}
          placeholderTextColor={slate[400]}
          multiline
          numberOfLines={Platform.OS === 'ios' ? undefined : 4}
          textAlignVertical="top"
          maxLength={CONCERN_NOTES_MAX}
        />
      </View>

      {/* Submit CTA */}
      <TouchableOpacity
        style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityLabel={
          isSubmitting
            ? t('maintenance.form.submittingBtn')
            : t('maintenance.form.submitBtn')
        }
      >
        <Text style={styles.submitText}>
          {isSubmitting
            ? t('maintenance.form.submittingBtn')
            : t('maintenance.form.submitBtn')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: slate[700],
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  charCount: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: slate[400],
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    color: slate[900],
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  // Date strip
  dateStrip: { marginTop: 0 },
  dateStripContent: { gap: 8, paddingVertical: 4 },
  dateCard: {
    width: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 76,
  },
  dateCardSelected: {
    borderWidth: 2,
    borderColor: brand[700],
    backgroundColor: brand[50],
  },
  dateDayAbbr: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: brand[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateDayAbbrSelected: { color: brand[700] },
  dateDayNum: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: slate[900],
    lineHeight: 26,
    marginTop: 2,
  },
  dateDayNumSelected: { color: brand[900] },
  dateMonth: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: slate[400],
  },
  dateMonthSelected: { color: brand[700] },
  // Chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipFlex: {
    flex: 1,
  },
  chipSelected: {
    borderColor: brand[700],
    backgroundColor: brand[50],
  },
  chipText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: slate[700],
  },
  chipTextSelected: {
    color: brand[900],
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  submitBtn: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: brand[900],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
