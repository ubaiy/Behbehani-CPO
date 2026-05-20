/**
 * Vehicle Detail Page (VDP) — /listing/:id
 *
 * Hidden route (not in tab bar). Reachable via:
 *   • Tapping a ListingCard on the Home/Browse tab
 *   • Deep link: behbehani-cpo://listing/:id
 *   • Universal link: https://www.behbehani-motors.com/en/cars/:slug
 *
 * TODO (W2): Implement full VDP with:
 *   - ListingsPublicApiClient.getBySlug(id) for detail data
 *   - Photo gallery (expo-image carousel)
 *   - Inspection score badge
 *   - "Reserve Now" CTA → /reserve/:listingId
 *   - Share sheet with OG metadata from /v1/public/og/listings/:id
 */

import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize, spacing } from '../../src/theme/theme';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>TODO: listing/[id] — W2</Text>
        <Text style={styles.param}>id: {id}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  param: {
    marginTop: spacing[2],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
