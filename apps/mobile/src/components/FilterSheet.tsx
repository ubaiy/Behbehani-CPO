/**
 * FilterSheet — bottom-sheet filter panel for the Browse screen.
 *
 * Uses React Native Modal (no @gorhom/bottom-sheet in deps).
 * 88vh tall, drag-handle on top, scrollable filter sections,
 * sticky "Show N cars" CTA at the bottom.
 *
 * Greyed-out sections are rendered visually muted with a "Coming soon" pill.
 * Only Brand, Body Type, and Budget Max are wired to active filter state.
 */

import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  I18nManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamily, palette, radius, spacing } from '../theme/theme';

import { BrandPicker } from './filter/BrandPicker';
import { BodyTypePicker } from './filter/BodyTypePicker';
import { BudgetSlider } from './filter/BudgetSlider';
import { RangeSliderGreyed } from './filter/RangeSliderGreyed';
import { TransmissionPicker } from './filter/TransmissionPicker';
import { FuelTypePicker } from './filter/FuelTypePicker';
import { ColorSwatchPicker } from './filter/ColorSwatchPicker';
import { RegionalSpecsPicker } from './filter/RegionalSpecsPicker';
import { FilterStickyShowNCarsCTA } from './filter/FilterStickyShowNCarsCTA';
import { ToggleRow } from './filter/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrowseFilters {
  brand?: string;
  body?: string;
  budgetMaxKwd?: number; // KWD — converted to fils before API call
  sort?: 'featured' | 'priceAsc' | 'priceDesc' | 'mileageAsc' | 'newest';
}

export interface FilterSheetProps {
  visible: boolean;
  initialFilters: BrowseFilters;
  onApply: (filters: BrowseFilters) => void;
  onReset: () => void;
  onClose: () => void;
  matchCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_H * 0.88;

// ─── Component ────────────────────────────────────────────────────────────────

export function FilterSheet({
  visible,
  initialFilters,
  onApply,
  onReset,
  onClose,
  matchCount,
}: FilterSheetProps) {
  const { t } = useTranslation();
  const [selectedBrand, setSelectedBrand] = useState<string | undefined>(initialFilters.brand);
  const [selectedBody, setSelectedBody] = useState<string | undefined>(initialFilters.body);
  const [budgetMax, setBudgetMax] = useState<string>(
    initialFilters.budgetMaxKwd !== undefined ? String(initialFilters.budgetMaxKwd) : ''
  );
  const [inspectedOnly, setInspectedOnly] = useState(false);
  const [warrantyOnly, setWarrantyOnly] = useState(false);

  const handleReset = useCallback(() => {
    setSelectedBrand(undefined);
    setSelectedBody(undefined);
    setBudgetMax('');
    setInspectedOnly(false);
    setWarrantyOnly(false);
    onReset();
  }, [onReset]);

  const handleApply = useCallback(() => {
    const filters: BrowseFilters = {};
    if (selectedBrand) filters.brand = selectedBrand;
    if (selectedBody) filters.body = selectedBody;
    const parsed = parseFloat(budgetMax);
    if (!isNaN(parsed) && parsed > 0) filters.budgetMaxKwd = parsed;
    onApply(filters);
  }, [selectedBrand, selectedBody, budgetMax, onApply]);

  const toggleBrand = useCallback((brand: string) => {
    setSelectedBrand(prev => (prev === brand ? undefined : brand));
  }, []);

  const toggleBody = useCallback((body: string) => {
    setSelectedBody(prev => (prev === body ? undefined : body));
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={ss.backdrop}>
        <View style={[ss.sheet, { height: SHEET_HEIGHT }]}>
          {/* Drag handle */}
          <View style={ss.handleWrap}>
            <View style={ss.handle} />
          </View>

          {/* Sheet header */}
          <View style={ss.sheetHeader}>
            <TouchableOpacity onPress={handleReset} style={ss.resetBtn} hitSlop={8}>
              <Text style={ss.resetText}>{t('filter.resetAll')}</Text>
            </TouchableOpacity>
            <Text style={ss.sheetTitle}>{t('filter.sheetTitle')}</Text>
            <TouchableOpacity onPress={onClose} style={ss.closeBtn} hitSlop={8} accessibilityLabel={t('common.closeA11y')}>
              <Text style={ss.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable content */}
          <ScrollView
            style={ss.scrollArea}
            contentContainerStyle={ss.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <BrandPicker selected={selectedBrand} onToggle={toggleBrand} />
            <BodyTypePicker selected={selectedBody} onToggle={toggleBody} />

            {/* Year (coming soon) */}
            <View style={[ss.section, ss.sectionDisabled]}>
              <View style={ss.yearRow}>
                <View style={ss.yearField}>
                  <Text style={ss.yearLabel}>{t('filter.yearFrom')}</Text>
                  <View style={[ss.yearInput, ss.disabledInput]}>
                    <Text style={ss.disabledText}>2020</Text>
                  </View>
                </View>
                <View style={ss.yearField}>
                  <Text style={ss.yearLabel}>{t('filter.yearTo')}</Text>
                  <View style={[ss.yearInput, ss.disabledInput]}>
                    <Text style={ss.disabledText}>2025</Text>
                  </View>
                </View>
              </View>
            </View>

            <BudgetSlider budgetMax={budgetMax} onChangeBudgetMax={setBudgetMax} />

            <RangeSliderGreyed
              title={t('filter.monthlyPayment')}
              minLabel={t('filter.monthlyMin')}
              maxLabel={t('filter.monthlyMax')}
            />
            <RangeSliderGreyed
              title={t('filter.mileageKm')}
              minLabel={t('filter.mileageMin')}
              maxLabel={t('filter.mileageMax')}
            />

            <TransmissionPicker />
            <FuelTypePicker />
            <ColorSwatchPicker />
            <RegionalSpecsPicker />

            {/* Vehicle assurance */}
            <View style={ss.section}>
              <ToggleRow
                label={t('filter.behbehaniInspectedLabel')}
                sublabel={t('filter.behbehaniInspectedSub')}
                value={inspectedOnly}
                onToggle={setInspectedOnly}
              />
              <ToggleRow
                label={t('filter.warrantyIncludedLabel')}
                sublabel={t('filter.warrantyIncludedSub')}
                value={warrantyOnly}
                onToggle={setWarrantyOnly}
              />
            </View>

            {/* Extra bottom padding so content isn't hidden under sticky CTA */}
            <View style={{ height: spacing[12] + 16 }} />
          </ScrollView>

          <FilterStickyShowNCarsCTA matchCount={matchCount} onApply={handleApply} />
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: palette.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 48,
    height: 6,
    backgroundColor: palette.gray300,
    borderRadius: radius.full,
  },
  sheetHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray100,
  },
  resetBtn: {
    minHeight: 44,
    paddingHorizontal: spacing[2],
    justifyContent: 'center',
  },
  resetText: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: palette.royalBlue700,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: fontFamily.bold,
    color: palette.gray900,
  },
  closeBtn: {
    minHeight: 44,
    paddingHorizontal: spacing[2],
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 17,
    color: palette.gray500,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
  },
  section: {
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray100,
    gap: spacing[3],
  },
  sectionDisabled: {
    opacity: 0.55,
  },
  yearRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    gap: spacing[2],
  },
  yearField: {
    flex: 1,
    gap: 4,
  },
  yearLabel: {
    fontSize: 10,
    fontFamily: fontFamily.semiBold,
    color: palette.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  yearInput: {
    height: 44,
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.gray200,
    backgroundColor: palette.gray50,
    justifyContent: 'center',
  },
  disabledInput: {
    opacity: 0.6,
  },
  disabledText: {
    color: palette.gray400,
  },
});
