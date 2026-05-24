/**
 * InspectorCard — "Your Inspector" card for the sell-concierge tracker.
 *
 * Mirrors A's TrackerInspectorCardComponent:
 *   - Gradient avatar (brand-200 → brand-400) with initials
 *   - Brand-700 star rating (NOT amber/yellow — brand-lock)
 *   - WhatsApp + Call buttons (brand-700 bg / white border)
 *
 * Uses expo-linear-gradient for the avatar gradient — same as account hero.
 * Gracefully falls back to a flat brand-300 bg if LinearGradient unavailable.
 */

import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';

export interface InspectorInfo {
  fullName: string;
  initials: string;
  firstName: string;
  rating: string;
  completedCount: number;
  whatsappE164: string;
  callE164: string;
}

interface Props {
  inspector: InspectorInfo | null;
}

function getWhatsAppUrl(e164: string): string {
  return `https://wa.me/${e164.replace(/^\+/, '')}`;
}

// Avatar with gradient — tries LinearGradient, falls back to View.
function Avatar({ initials }: { initials: string }) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const { LinearGradient } = require('expo-linear-gradient') as {
      LinearGradient: React.ComponentType<{
        colors: string[];
        start?: { x: number; y: number };
        end?: { x: number; y: number };
        style?: object;
        children?: React.ReactNode;
      }>;
    };
    return (
      <LinearGradient
        colors={[brand[200], brand[400]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatar}
      >
        <Text style={styles.avatarText}>{initials}</Text>
      </LinearGradient>
    );
  } catch {
    return (
      <View style={[styles.avatar, { backgroundColor: brand[300] }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    );
  }
}

export function InspectorCard({ inspector }: Props) {
  const { t } = useTranslation();

  if (!inspector) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionLabel}>
          {t('sellTracker.inspector.title', 'YOUR INSPECTOR')}
        </Text>
        <Text style={styles.notYetAssigned}>
          {t('sellTracker.inspector.notYetAssigned', 'An inspector will be assigned shortly.')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>
        {t('sellTracker.inspector.title', 'YOUR INSPECTOR')}
      </Text>

      <View style={styles.profileRow}>
        <Avatar initials={inspector.initials} />
        <View style={styles.infoBlock}>
          <Text style={styles.fullName}>{inspector.fullName}</Text>
          <View style={styles.metaRow}>
            {/* Rating — brand-700 star, NOT amber */}
            <Text style={styles.starIcon}>★</Text>
            <Text style={styles.rating}>{inspector.rating}</Text>
            <Text style={styles.separator}>·</Text>
            <Text style={styles.completedText}>
              {t('sellTracker.inspector.completed', {
                count: inspector.completedCount,
                defaultValue: `${inspector.completedCount} inspections`,
              })}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.primaryBtn]}
          onPress={() => void Linking.openURL(getWhatsAppUrl(inspector.whatsappE164))}
          accessibilityRole="link"
          accessibilityLabel={t('sellTracker.inspector.whatsappA11y', {
            name: inspector.firstName,
          })}
        >
          <Text style={styles.primaryBtnText}>
            {t('sellTracker.inspector.whatsapp', {
              firstName: inspector.firstName,
              defaultValue: `WhatsApp ${inspector.firstName}`,
            })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.secondaryBtn]}
          onPress={() => void Linking.openURL(`tel:${inspector.callE164}`)}
          accessibilityRole="link"
          accessibilityLabel={t('sellTracker.inspector.callA11y', 'Call inspector')}
        >
          <Text style={styles.secondaryBtnText}>
            {t('sellTracker.inspector.call', 'Call')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: slate[200],
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  sectionLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: slate[500],
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  notYetAssigned: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: slate[500],
    lineHeight: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  infoBlock: {
    flex: 1,
    gap: 4,
  },
  fullName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: slate[900],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  starIcon: {
    fontSize: 13,
    color: brand[700], // brand-700 star — NOT amber
  },
  rating: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: slate[700],
  },
  separator: {
    color: slate[400],
    fontSize: 13,
  },
  completedText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: slate[500],
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryBtn: {
    backgroundColor: brand[700],
  },
  primaryBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: slate[200],
  },
  secondaryBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: slate[800],
  },
});
