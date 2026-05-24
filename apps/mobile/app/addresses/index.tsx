/**
 * Addresses list + manage screen — /addresses
 *
 * Task v0.18.b — wired to GET /v1/public/me/addresses + POST/PATCH/DELETE.
 *
 * This route file is the slim orchestrator.
 * Heavy sub-components live in:
 *   src/components/addresses/AddressFormModal.tsx
 *   src/components/addresses/DeleteAddressModal.tsx
 *
 * Palette: white + brand + slate. Red ONLY for Delete actions.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { AddressDto } from '@behbehani-cpo/shared-types';
import { brand, slate, red } from '../../src/theme/colors';
import { meAccountApiClient } from '../../src/services/http';
import {
  AddressFormModal,
  EMPTY_ADDRESS_FORM,
  type AddressFormState,
} from '../../src/components/addresses/AddressFormModal';
import { DeleteAddressModal } from '../../src/components/addresses/DeleteAddressModal';

// ─── Address list item ────────────────────────────────────────────────────────

function AddressListItem({
  address,
  onEdit,
  onDelete,
}: {
  address: AddressDto;
  onEdit: (a: AddressDto) => void;
  onDelete: (a: AddressDto) => void;
}) {
  const { t } = useTranslation();
  const formatted = [
    address.building,
    `${t('addresses.blockShort')} ${address.block}`,
    address.street,
    address.area,
    t(`addresses.governorate.${address.governorate}`),
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={styles.item}>
      <View style={styles.itemContent}>
        <View style={styles.itemLabelRow}>
          <Text style={styles.itemLabel}>{address.label}</Text>
          {address.isDefault ? (
            <View style={styles.defaultPill}>
              <Text style={styles.defaultPillText}>{t('addresses.defaultPill')}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.itemAddress} numberOfLines={2}>
          {formatted}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => onEdit(address)}
          accessibilityLabel={t('addresses.editA11y', { label: address.label })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.editBtnText}>{t('addresses.editBtn')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(address)}
          accessibilityLabel={t('addresses.deleteA11y', { label: address.label })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.deleteBtnText}>{t('addresses.deleteBtn')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AddressesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['me', 'addresses'],
    queryFn: () => meAccountApiClient.listAddresses(),
    staleTime: 60_000,
  });

  const [formVisible, setFormVisible] = useState(false);
  const [formInitial, setFormInitial] = useState<AddressFormState>(EMPTY_ADDRESS_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AddressDto | null>(null);
  const [deleteVisible, setDeleteVisible] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => meAccountApiClient.deleteAddress(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me', 'addresses'] });
      setDeleteVisible(false);
      setDeleteTarget(null);
    },
    onError: () => {
      Alert.alert(t('addresses.deleteErrorTitle'), t('addresses.deleteErrorBody'));
    },
  });

  const handleAdd = useCallback(() => {
    setEditingId(null);
    setFormInitial(EMPTY_ADDRESS_FORM);
    setFormVisible(true);
  }, []);

  const handleEdit = useCallback((address: AddressDto) => {
    setEditingId(address.id);
    setFormInitial({
      label: address.label,
      governorate: address.governorate as AddressFormState['governorate'],
      area: address.area,
      block: address.block,
      street: address.street,
      building: address.building,
      unit: address.unit ?? '',
    });
    setFormVisible(true);
  }, []);

  const handleDelete = useCallback((address: AddressDto) => {
    setDeleteTarget(address);
    setDeleteVisible(true);
  }, []);

  const handleFormSaved = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['me', 'addresses'] });
    setFormVisible(false);
  }, [queryClient]);

  const addresses = data?.items ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backBtnText}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('addresses.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Add CTA */}
      <View style={styles.addRow}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleAdd}
          accessibilityRole="button"
          accessibilityLabel={t('addresses.addCta')}
        >
          <Text style={styles.addBtnText}>{t('addresses.addCta')}</Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={brand[700]} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('addresses.loadError')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>{t('addresses.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>{t('addresses.emptyTitle')}</Text>
          <Text style={styles.emptyHint}>{t('addresses.emptyHint')}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {addresses.map((address) => (
            <AddressListItem
              key={address.id}
              address={address}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </ScrollView>
      )}

      <AddressFormModal
        visible={formVisible}
        initial={formInitial}
        editingId={editingId}
        onClose={() => setFormVisible(false)}
        onSaved={handleFormSaved}
      />

      <DeleteAddressModal
        visible={deleteVisible}
        addressLabel={deleteTarget?.label ?? ''}
        onCancel={() => {
          setDeleteVisible(false);
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        deleting={deleteMutation.isPending}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: slate[100],
    backgroundColor: '#FFFFFF',
  },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  backBtnText: { fontSize: 26, color: brand[700], lineHeight: 30 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: slate[900],
  },
  headerSpacer: { minWidth: 44 },
  addRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: slate[100],
  },
  addBtn: {
    minHeight: 48,
    backgroundColor: brand[700],
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  scroll: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, gap: 12 },
  item: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[100],
    padding: 16,
  },
  itemContent: { marginBottom: 12 },
  itemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  itemLabel: { fontSize: 15, fontWeight: '600', color: slate[900] },
  defaultPill: {
    backgroundColor: brand[50],
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultPillText: { fontSize: 11, fontWeight: '600', color: brand[700] },
  itemAddress: { fontSize: 14, color: slate[600], lineHeight: 20 },
  itemActions: { flexDirection: 'row', gap: 12 },
  editBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brand[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: { fontSize: 14, fontWeight: '500', color: brand[700] },
  deleteBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: red[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 14, fontWeight: '500', color: red[500] },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: slate[800],
    textAlign: 'center',
  },
  emptyHint: { fontSize: 14, color: slate[500], textAlign: 'center' },
  errorText: { fontSize: 16, color: slate[600], textAlign: 'center' },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: 24,
    backgroundColor: brand[700],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
