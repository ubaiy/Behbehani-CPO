/**
 * DangerZone — 3 red-700 destructive rows.
 * Sign out / Sign out all devices / Delete account (30-day grace).
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { slate } from '../../theme/colors';

const RED_50 = '#FEF2F2';
const RED_200 = '#FECACA';
const RED_700 = '#B91C1C';

interface Props {
  onSignOut: () => void;
  onSignOutAll: () => void;
  onDeleteAccount: () => void;
}

export function DangerZone({ onSignOut, onSignOutAll, onDeleteAccount }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('account.dangerZone.heading')}</Text>

      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={onSignOut}
        accessibilityRole="button"
      >
        <Text style={styles.rowIcon}>{'↪'}</Text>
        <Text style={styles.rowText}>{t('account.dangerZone.signOutBtn')}</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={onSignOutAll}
        accessibilityRole="button"
      >
        <Text style={styles.rowIcon}>{'⊗'}</Text>
        <Text style={styles.rowText}>{t('account.dangerZone.signOutAllBtn')}</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={onDeleteAccount}
        accessibilityRole="button"
      >
        <Text style={styles.rowIcon}>{'🗑'}</Text>
        <View style={styles.rowBody}>
          <Text style={styles.rowText}>{t('account.dangerZone.deleteAccountBtn')}</Text>
          <Text style={styles.rowCaption}>{t('account.dangerZone.deleteAccountCaption')}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: RED_200,
    backgroundColor: RED_50,
    padding: 8,
  },
  label: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700',
    fontSize: 10,
    color: RED_700,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  row: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
  },
  rowPressed: {
    backgroundColor: RED_200,
  },
  rowIcon: {
    fontSize: 18,
    color: RED_700,
    flexShrink: 0,
    width: 20,
    textAlign: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowText: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '600',
    fontSize: 14,
    color: RED_700,
    flex: 1,
  },
  rowCaption: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '400',
    fontSize: 11,
    color: slate[500],
    marginTop: 2,
  },
});
