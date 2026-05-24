/**
 * AddressFormModal — slide-up sheet for creating or editing a saved address.
 *
 * Task v0.18.b — extracted from app/addresses/index.tsx to keep route < 500 lines.
 * Used for both POST /v1/public/me/addresses and PATCH /v1/public/me/addresses/:id.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { AddressInputDto } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../theme/colors';
import { meAccountApiClient } from '../../services/http';
import { newIdempotencyKey } from '../orders/orders.utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Governorate =
  | 'capital'
  | 'hawalli'
  | 'ahmadi'
  | 'jahra'
  | 'farwaniya'
  | 'mubarak_al_kabeer';

export type AddressFormState = {
  label: string;
  governorate: Governorate;
  area: string;
  block: string;
  street: string;
  building: string;
  unit: string;
};

export const EMPTY_ADDRESS_FORM: AddressFormState = {
  label: '',
  governorate: 'capital',
  area: '',
  block: '',
  street: '',
  building: '',
  unit: '',
};

const GOVERNORATES: Governorate[] = [
  'capital',
  'hawalli',
  'farwaniya',
  'mubarak_al_kabeer',
  'ahmadi',
  'jahra',
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AddressFormModal({
  visible,
  initial,
  editingId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  initial: AddressFormState;
  editingId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<AddressFormState>(initial);
  const [saving, setSaving] = useState(false);

  const setField = (k: keyof AddressFormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = useCallback(async () => {
    if (
      !form.label.trim() ||
      !form.area.trim() ||
      !form.block.trim() ||
      !form.street.trim() ||
      !form.building.trim()
    ) {
      Alert.alert(t('addresses.validationTitle'), t('addresses.validationBody'));
      return;
    }
    setSaving(true);
    try {
      const input: AddressInputDto = {
        label: form.label.trim(),
        governorate: form.governorate,
        area: form.area.trim(),
        block: form.block.trim(),
        street: form.street.trim(),
        building: form.building.trim(),
        unit: form.unit.trim() || null,
      };
      if (editingId) {
        await meAccountApiClient.updateAddress(editingId, input);
      } else {
        await meAccountApiClient.createAddress(input, newIdempotencyKey());
      }
      onSaved();
    } catch {
      Alert.alert(t('addresses.saveErrorTitle'), t('addresses.saveErrorBody'));
    } finally {
      setSaving(false);
    }
  }, [form, editingId, onSaved, t]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.cancelBtn}
            accessibilityLabel={t('addresses.formCancel')}
          >
            <Text style={styles.cancelText}>{t('addresses.formCancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {editingId ? t('addresses.editTitle') : t('addresses.addTitle')}
          </Text>
          <View style={styles.spacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.fieldLabel}>{t('addresses.fieldLabel')}</Text>
          <TextInput
            style={styles.input}
            value={form.label}
            onChangeText={(v) => setField('label', v)}
            placeholder={t('addresses.fieldLabelPlaceholder')}
            placeholderTextColor={slate[400]}
          />

          <Text style={styles.fieldLabel}>{t('addresses.fieldGovernorate')}</Text>
          <View style={styles.chipRow}>
            {GOVERNORATES.map((gov) => (
              <TouchableOpacity
                key={gov}
                style={[styles.chip, form.governorate === gov && styles.chipActive]}
                onPress={() => setField('governorate', gov)}
                accessibilityRole="button"
                accessibilityState={{ selected: form.governorate === gov }}
              >
                <Text
                  style={[
                    styles.chipText,
                    form.governorate === gov && styles.chipTextActive,
                  ]}
                >
                  {t(`addresses.governorate.${gov}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>{t('addresses.fieldArea')}</Text>
          <TextInput
            style={styles.input}
            value={form.area}
            onChangeText={(v) => setField('area', v)}
            placeholder={t('addresses.fieldAreaPlaceholder')}
            placeholderTextColor={slate[400]}
          />

          <Text style={styles.fieldLabel}>{t('addresses.fieldBlock')}</Text>
          <TextInput
            style={styles.input}
            value={form.block}
            onChangeText={(v) => setField('block', v)}
            placeholder={t('addresses.fieldBlockPlaceholder')}
            placeholderTextColor={slate[400]}
            keyboardType="number-pad"
          />

          <Text style={styles.fieldLabel}>{t('addresses.fieldStreet')}</Text>
          <TextInput
            style={styles.input}
            value={form.street}
            onChangeText={(v) => setField('street', v)}
            placeholder={t('addresses.fieldStreetPlaceholder')}
            placeholderTextColor={slate[400]}
          />

          <Text style={styles.fieldLabel}>{t('addresses.fieldBuilding')}</Text>
          <TextInput
            style={styles.input}
            value={form.building}
            onChangeText={(v) => setField('building', v)}
            placeholder={t('addresses.fieldBuildingPlaceholder')}
            placeholderTextColor={slate[400]}
          />

          <Text style={styles.fieldLabel}>{t('addresses.fieldUnit')}</Text>
          <TextInput
            style={styles.input}
            value={form.unit}
            onChangeText={(v) => setField('unit', v)}
            placeholder={t('addresses.fieldUnitPlaceholder')}
            placeholderTextColor={slate[400]}
          />
        </ScrollView>

        {/* Save CTA */}
        <View style={styles.cta}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel={t('addresses.saveBtn')}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{t('addresses.saveBtn')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: slate[100],
  },
  cancelBtn: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelText: { fontSize: 16, color: brand[700] },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: slate[900],
  },
  spacer: { minWidth: 60 },
  scroll: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: slate[200],
    borderRadius: 8,
    fontSize: 16,
    color: slate[900],
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#FFFFFF',
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: brand[700], borderColor: brand[700] },
  chipText: { fontSize: 14, color: slate[700] },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  cta: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: slate[100],
  },
  saveBtn: {
    minHeight: 48,
    backgroundColor: brand[700],
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { backgroundColor: slate[200] },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
