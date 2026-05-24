/**
 * MaintenanceListItem — single row card in the maintenance requests list.
 *
 * Structure:
 *   [id short · status pill]
 *   [vehicle title or free-text]
 *   [governorate · concern category]
 *   [preferred date · window]
 *
 * Touch target: entire row is the press target, minHeight >= 88px.
 * Governorate display label via t('maintenance.governorate.<snake_case_wire_value>').
 */

import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MaintenanceRequestDto } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../theme/colors';
import { MaintenanceStatusPill } from './MaintenanceStatusPill';

interface Props {
  item: MaintenanceRequestDto;
  onPress: () => void;
}

export function MaintenanceListItem({ item, onPress }: Props) {
  const { t } = useTranslation();

  const vehicleLabel = item.vehicleFreeText
    ? item.vehicleFreeText
    : t('maintenance.form.vehiclePlaceholder');

  const shortId = `#${item.id.slice(-6).toUpperCase()}`;

  const governorateLabel = t(`maintenance.governorate.${item.governorate}`, {
    defaultValue: item.governorate,
  });

  const categoryLabel = t(`maintenance.concern.${item.concernCategory}`, {
    defaultValue: item.concernCategory,
  });

  const windowLabel = t(`maintenance.window.${item.preferredWindow}`, {
    defaultValue: item.preferredWindow,
  });

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={t('maintenance.list.itemA11y', {
        ref: shortId,
        vehicle: vehicleLabel,
      })}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      {/* Row 1: short id + status pill */}
      <View style={styles.headerRow}>
        <Text style={styles.refText}>{shortId}</Text>
        <MaintenanceStatusPill status={item.status} />
      </View>

      {/* Row 2: vehicle */}
      <Text style={styles.vehicleTitle} numberOfLines={1}>
        {vehicleLabel}
      </Text>

      {/* Row 3: governorate · concern */}
      <View style={styles.metaRow}>
        <Text style={styles.metaText} numberOfLines={1}>
          {governorateLabel}
        </Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaText} numberOfLines={1}>
          {categoryLabel}
        </Text>
      </View>

      {/* Row 4: preferred date · window */}
      <View style={styles.footerRow}>
        <Text style={styles.dateText}>
          {item.preferredDate}
        </Text>
        <Text style={styles.windowText}>{windowLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 88,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  refText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: brand[700],
    letterSpacing: 0.4,
  },
  vehicleTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: slate[900],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: slate[500],
    flexShrink: 1,
  },
  metaDot: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: slate[400],
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    gap: 8,
  },
  dateText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: slate[500],
    flexShrink: 1,
  },
  windowText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: brand[700],
    flexShrink: 1,
    textAlign: 'right',
  },
});
