/**
 * Offer declined — terminal screen.
 * Route: /offers/[token]/declined
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { brand, slate } from '../../../src/theme/colors';

const WHATSAPP_URL = 'whatsapp://send?phone=96522473006&text=Hi%20Behbehani';

export default function OfferDeclinedScreen() {
  const openWhatsApp = () => {
    Linking.openURL(WHATSAPP_URL).catch(() => {
      // Fallback: wa.me deep-link if native scheme unavailable
      Linking.openURL('https://wa.me/96522473006?text=Hi%20Behbehani');
    });
  };

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero: slate X icon + headline ────────────────────────────── */}
      <View style={s.hero}>
        <View style={s.iconCircle}>
          <Text style={s.xIcon}>✕</Text>
        </View>
        <Text style={s.heroTitle}>Offer declined</Text>
        <Text style={s.heroSub}>You chose not to accept this offer.</Text>
      </View>

      {/* ── What happens next card ────────────────────────────────────── */}
      <View style={s.card}>
        <Text style={s.cardHeading}>What happens next?</Text>
        <Text style={s.cardText}>
          If you change your mind, contact us by WhatsApp — we may be able to re-issue the offer at the same or a similar price.
        </Text>
      </View>

      {/* ── Re-issue note ─────────────────────────────────────────────── */}
      <View style={s.noteCard}>
        <Text style={s.noteText}>
          Behbehani may also send a new offer if market conditions change. Keep an eye on your notifications.
        </Text>
      </View>

      {/* ── WhatsApp CTA ──────────────────────────────────────────────── */}
      <TouchableOpacity
        style={s.whatsappBtn}
        onPress={openWhatsApp}
        accessibilityLabel="Contact Customer Service via WhatsApp"
      >
        <Text style={s.whatsappIcon}>💬</Text>
        <Text style={s.whatsappText}>Contact Customer Service</Text>
      </TouchableOpacity>

      {/* ── Back to account ───────────────────────────────────────────── */}
      <View style={s.footer}>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/account' as any)}
          accessibilityLabel="Back to account"
        >
          <Text style={s.footerLink}>Back to account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  content: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20, paddingBottom: 40,
  },

  // Hero
  hero: { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
  iconCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: slate[100], borderWidth: 2, borderColor: slate[200],
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  xIcon: { color: slate[400], fontSize: 26, fontFamily: 'PlusJakartaSans_700Bold' },
  heroTitle: {
    color: slate[800], fontSize: 24, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center',
  },
  heroSub: {
    color: slate[500], fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 22,
  },

  // Card
  card: {
    marginTop: 20, borderRadius: 16,
    borderWidth: 1, borderColor: slate[200], backgroundColor: '#fff', padding: 20,
  },
  cardHeading: { color: slate[800], fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 8 },
  cardText: { color: slate[600], fontSize: 13, lineHeight: 20 },

  // Note
  noteCard: {
    marginTop: 16, borderRadius: 12,
    backgroundColor: slate[50], borderWidth: 1, borderColor: slate[200], padding: 16,
  },
  noteText: { color: slate[600], fontSize: 13, lineHeight: 20 },

  // WhatsApp
  whatsappBtn: {
    marginTop: 20, height: 48, borderRadius: 12,
    backgroundColor: brand[700],
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  whatsappIcon: { fontSize: 18 },
  whatsappText: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },

  // Footer
  footer: { marginTop: 24, alignItems: 'center' },
  footerLink: { color: slate[500], fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' },
});
