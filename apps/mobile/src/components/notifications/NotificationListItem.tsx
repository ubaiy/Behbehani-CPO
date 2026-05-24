/**
 * NotificationListItem — single row card in the notifications list.
 *
 * Task v0.19.a — mirror of OrderListItem pattern.
 *
 * Layout:
 *   [channel glyph] [category badge]    [relative time]
 *   title (pre-localized — NO t())
 *   body  (pre-localized — NO t())
 *   unread indicator: brand[100] left edge + bolder style
 *
 * Behaviours:
 *   Tap → if deepLink starts with behbehani-motors:// call routeToDeepLink,
 *          then always fire markRead (fire-and-forget optimistic).
 *   Long press → confirm delete modal.
 *
 * Touch target: minHeight 72px (≥ 44px constraint met).
 */

import { useState } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NotificationSummaryDto, NotificationChannel } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../theme/colors';
import { isValidCustomSchemeUrl } from '../../services/deeplinks';
import { routeToDeepLink } from '../../notifications/notificationRouter';
import { CategoryBadge } from './CategoryBadge';
import { DeleteConfirmModal } from './DeleteConfirmModal';

// ─── Channel glyph map ────────────────────────────────────────────────────────

const CHANNEL_GLYPH: Record<NotificationChannel, string> = {
  push:  '🔔',
  email: '✉️',
  sms:   '💬',
  inApp: '📩',
};

// ─── Relative time formatter ──────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const secs = Math.floor(diff / 1_000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    if (hrs < 48) return 'Yesterday';
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  notification: NotificationSummaryDto;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NotificationListItem({ notification, onMarkRead, onDelete }: Props) {
  const { t } = useTranslation();
  const [deleteVisible, setDeleteVisible] = useState(false);
  const isUnread = !notification.isRead;

  const handlePress = () => {
    // 1. If deepLink is valid custom scheme, navigate.
    if (
      notification.deepLink &&
      isValidCustomSchemeUrl(notification.deepLink)
    ) {
      void routeToDeepLink(notification.deepLink);
    }
    // 2. Always mark read (fire-and-forget optimistic update).
    onMarkRead(notification.id);
  };

  const handleLongPress = () => {
    setDeleteVisible(true);
  };

  const handleDeleteConfirm = () => {
    setDeleteVisible(false);
    onDelete(notification.id);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.row, isUnread && styles.rowUnread]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('notifications.list.itemA11y', {
          title: notification.title,
        })}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        {/* Unread left edge accent */}
        {isUnread && <View style={styles.unreadAccent} />}

        <View style={styles.content}>
          {/* Top row: channel glyph + category badge + time */}
          <View style={styles.topRow}>
            <View style={styles.topLeft}>
              <Text style={styles.channelGlyph} accessibilityElementsHidden>
                {CHANNEL_GLYPH[notification.channel] ?? '🔔'}
              </Text>
              <CategoryBadge category={notification.category} />
            </View>
            <Text style={styles.timeText}>
              {formatRelativeTime(notification.createdAt)}
            </Text>
          </View>

          {/* Title — pre-localized, never wrap in t() */}
          <Text
            style={[styles.title, isUnread && styles.titleUnread]}
            numberOfLines={2}
          >
            {notification.title}
          </Text>

          {/* Body — pre-localized, never wrap in t() */}
          <Text style={styles.body} numberOfLines={3}>
            {notification.body}
          </Text>
        </View>
      </TouchableOpacity>

      <DeleteConfirmModal
        visible={deleteVisible}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteVisible(false)}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  rowUnread: {
    backgroundColor: brand[50],
  },
  unreadAccent: {
    width: 4,
    backgroundColor: brand[600],
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  channelGlyph: {
    fontSize: 14,
  },
  timeText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: slate[500],
    flexShrink: 0,
  },
  title: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: slate[900],
    lineHeight: 20,
  },
  titleUnread: {
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  body: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: slate[600],
    lineHeight: 18,
  },
});
