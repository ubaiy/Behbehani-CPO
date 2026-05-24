/**
 * PreferenceCard — one card per notification category, with 3 channel switches inside.
 *
 * Layout: category label at top, then a row of 3 channel toggles (push / email / sms).
 * accountSecurity row is locked — all 3 channel toggles are permanently "on" with a lock
 * indicator.
 *
 * Touch targets: each toggle row is min 44px tall.
 * Palette: brand[700] for active toggle track, slate for inactive.
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { brand, slate } from '../../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Channel = 'push' | 'email' | 'sms';

export interface PreferenceCardProps {
  /** i18n category label. */
  categoryLabel: string;
  /** Whether this category is locked (accountSecurity). */
  locked: boolean;
  /** Current state for each channel — { push, email, sms }. */
  values: Record<Channel, boolean>;
  /** Called when a toggle is tapped. Not called for locked rows. */
  onToggle: (channel: Channel) => void;
  /** True while a save is in-flight — disables all toggles. */
  disabled: boolean;
  /** i18n channel labels. */
  channelLabels: Record<Channel, string>;
  /** i18n "Always on" label for locked row. */
  lockedLabel: string;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

interface ChannelToggleProps {
  channel: Channel;
  label: string;
  value: boolean;
  locked: boolean;
  disabled: boolean;
  onToggle: (channel: Channel) => void;
}

function ChannelToggle({ channel, label, value, locked, disabled, onToggle }: ChannelToggleProps) {
  const isOn = locked ? true : value;
  const trackBg = isOn ? brand[700] : slate[200];

  return (
    <TouchableOpacity
      style={styles.toggleRow}
      onPress={() => !locked && onToggle(channel)}
      disabled={locked || disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: isOn, disabled: locked || disabled }}
      accessibilityLabel={label}
    >
      <Text style={[styles.channelLabel, locked && styles.channelLabelLocked]}>
        {label}
      </Text>
      <View style={[styles.track, { backgroundColor: trackBg }]}>
        <View style={[styles.thumb, isOn ? styles.thumbOn : styles.thumbOff]} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PreferenceCard({
  categoryLabel,
  locked,
  values,
  onToggle,
  disabled,
  channelLabels,
  lockedLabel,
}: PreferenceCardProps) {
  const channels: Channel[] = ['push', 'email', 'sms'];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.categoryLabel}>{categoryLabel}</Text>
        {locked && (
          <View style={styles.lockedBadge}>
            <Text style={styles.lockedBadgeText}>{lockedLabel}</Text>
          </View>
        )}
      </View>

      <View style={styles.togglesContainer}>
        {channels.map((ch) => (
          <ChannelToggle
            key={ch}
            channel={ch}
            label={channelLabels[ch]}
            value={values[ch]}
            locked={locked}
            disabled={disabled}
            onToggle={onToggle}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: slate[100],
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 8,
  },
  categoryLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: slate[900],
    flex: 1,
  },
  lockedBadge: {
    backgroundColor: brand[50],
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: brand[200],
  },
  lockedBadgeText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: brand[700],
  },
  togglesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: slate[50],
  },
  channelLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: slate[700],
    flex: 1,
  },
  channelLabelLocked: {
    color: slate[400],
  },
  track: {
    width: 40,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    padding: 2,
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbOn: {
    alignSelf: 'flex-end',
  },
  thumbOff: {
    alignSelf: 'flex-start',
  },
});
