/**
 * SessionListItem — single active-session row in the Security screen.
 *
 * Shows: device label, IP address (if available), last-active relative time.
 * "This device" badge for isCurrent sessions; "Revoke" button for others.
 *
 * Touch target: min 44px. Revoke button uses red[600] per brand-lock constraints.
 */

import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { brand, slate } from '../../theme/colors';
import type { SessionSummaryDto } from '@behbehani-cpo/data-access-mobile';

// ─── Relative time helper ────────────────────────────────────────────────────

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  } catch {
    return '';
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SessionListItemProps {
  session: SessionSummaryDto;
  /** True when this specific session's revoke call is in-flight. */
  isRevoking: boolean;
  onRevoke: (id: string) => void;
  /** i18n labels passed from parent to keep this component translation-agnostic. */
  labels: {
    thisDevice: string;
    revokeBtn: string;
    revokingBtn: string;
    unknownDevice: string;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SessionListItem({
  session,
  isRevoking,
  onRevoke,
  labels,
}: SessionListItemProps) {
  const deviceLabel = session.deviceLabel ?? labels.unknownDevice;
  const lastActive = formatRelativeTime(session.lastActiveAt ?? session.createdAt);
  const meta = [session.ipAddress, lastActive].filter(Boolean).join(' · ');

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.deviceLabel} numberOfLines={1}>
          {deviceLabel}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>

      <View style={styles.action}>
        {session.isCurrent ? (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>{labels.thisDevice}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.revokeBtn, isRevoking && styles.revokeBtnDisabled]}
            onPress={() => onRevoke(session.id)}
            disabled={isRevoking}
            accessibilityRole="button"
            accessibilityLabel={`${labels.revokeBtn} ${deviceLabel}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isRevoking ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Text style={styles.revokeBtnText}>{labels.revokeBtn}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: slate[100],
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  deviceLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: slate[900],
  },
  meta: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: slate[500],
  },
  action: {
    flexShrink: 0,
  },
  currentBadge: {
    backgroundColor: brand[50],
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: brand[200],
  },
  currentBadgeText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: brand[700],
  },
  revokeBtn: {
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
  },
  revokeBtnDisabled: {
    opacity: 0.5,
  },
  revokeBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: '#DC2626',
  },
});
