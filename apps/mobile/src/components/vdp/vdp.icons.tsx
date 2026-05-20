/**
 * Inline SVG-substitute icons for VDP components.
 * React Native does not render SVG natively — these are minimal approximations.
 * Replace with react-native-svg icons when the icon library is integrated.
 * Extracted from apps/mobile/app/listings/[slug].tsx
 */

import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { brand, slate, red } from '../../theme/colors';

export function ShareIcon() {
  return <Text style={styles.iconText}>↗</Text>;
}

export function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <Text style={[styles.iconText, filled && { color: red[500] }]}>{filled ? '♥' : '♡'}</Text>
  );
}

export function PlayIcon() {
  return <Text style={[styles.iconText, { color: '#FFFFFF' }]}>▶</Text>;
}

export function ShieldIcon({ size = 16, color = brand[700] }: { size?: number; color?: string }) {
  return <Text style={{ fontSize: size, color }}>🛡</Text>;
}

export function WarrantyIcon() {
  return <Text style={{ fontSize: 16, color: brand[700] }}>🔒</Text>;
}

export function ReturnIcon() {
  return <Text style={{ fontSize: 16, color: brand[700] }}>↩</Text>;
}

export function TruckIcon() {
  return <Text style={{ fontSize: 16, color: brand[700] }}>🚚</Text>;
}

export function CheckIcon({ size = 16, color = brand[700] }: { size?: number; color?: string }) {
  return <Text style={{ fontSize: size, color }}>✓</Text>;
}

export function CreditCardIcon() {
  return <Text style={{ fontSize: 14, color: brand[700] }}>💳</Text>;
}

export function OfferIcon() {
  return <Text style={{ fontSize: 16, color: brand[700] }}>$</Text>;
}

export function CalendarIcon() {
  return <Text style={{ fontSize: 16, color: brand[700] }}>📅</Text>;
}

export function LoanIcon() {
  return <Text style={{ fontSize: 16, color: brand[700] }}>🏦</Text>;
}

export function ChatIcon({ color = brand[700] }: { color?: string }) {
  return <Text style={{ fontSize: 16, color }}>💬</Text>;
}

export function PhoneIcon() {
  return <Text style={{ fontSize: 16, color: slate[700] }}>📞</Text>;
}

export function CarSilhouette() {
  return (
    <View style={styles.carSilhouette}>
      <Text style={styles.carSilhouetteText}>🚗</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iconText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  carSilhouette: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  carSilhouetteText: {
    fontSize: 80,
    opacity: 0.3,
  },
});
