import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { fontFamily, radius, spacing } from '../../theme/theme';
import { brand, slate } from '../../theme/colors';
import { TrustBadgeStrip } from './TrustBadgeStrip';

export function Header() {
  const router = useRouter();

  return (
    <View style={s.header}>
      {/* Logo row */}
      <View style={s.logoRow}>
        <View style={s.logoMark}>
          <Text style={s.logoMarkText}>B</Text>
        </View>
        <View style={s.logoText}>
          <Text style={s.brandName}>Behbehani Motors</Text>
          <Text style={s.brandSub}>KUWAIT · CERTIFIED</Text>
        </View>
        {/* Notification bell */}
        <Pressable style={s.bellButton} accessibilityRole="button" accessibilityLabel="Notifications">
          <Text style={s.bellIcon}>🔔</Text>
          <View style={s.bellDot} />
        </Pressable>
      </View>

      {/* Greeting */}
      <View style={s.greetingBlock}>
        <Text style={s.greetingSub}>Good evening, Abbas</Text>
        <Text style={s.greetingTitle}>Find your next car.</Text>
      </View>

      {/* Search bar */}
      <Pressable
        style={s.searchBar}
        onPress={() => router.push('/(tabs)/browse' as never)}
        accessibilityRole="search"
        accessibilityLabel="Search cars"
      >
        <Text style={s.searchIcon}>🔍</Text>
        <Text style={s.searchPlaceholder}>Search make, model, or budget</Text>
        <View style={s.searchCount}>
          <Text style={s.searchCountText}>143 cars</Text>
        </View>
      </Pressable>

      {/* Trust badge strip */}
      <TrustBadgeStrip />
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: slate[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 30,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: radius.xl,
    backgroundColor: brand[900],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[2],
  },
  logoMarkText: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  logoText: {
    flex: 1,
  },
  brandName: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: slate[900],
    lineHeight: 17,
  },
  brandSub: {
    fontFamily: fontFamily.medium,
    fontSize: 9,
    color: brand[700],
    letterSpacing: 1,
  },
  bellButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 20,
    color: slate[600],
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  greetingBlock: {
    marginBottom: spacing[3],
  },
  greetingSub: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: slate[500],
    marginBottom: 2,
  },
  greetingTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    color: slate[900],
    lineHeight: 28,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: slate[100],
    borderRadius: radius['2xl'],
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    marginBottom: spacing[3],
    minHeight: 48,
  },
  searchIcon: {
    fontSize: 16,
    color: slate[500],
  },
  searchPlaceholder: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: slate[500],
  },
  searchCount: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: slate[200],
    borderRadius: radius.lg,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
  },
  searchCountText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: brand[700],
  },
});
