/**
 * Standalone search modal — /search
 *
 * Hidden route (not in tab bar). Presented as a modal from the Browse tab's
 * search icon (W2). Uses ListingPublicFilterSchema params.
 *
 * TODO (W2): Implement full search UI:
 *   - Free text search input
 *   - Brand / body-type / price-range filters
 *   - Year range slider (pending Q-A-1 resolution — MOBILE_API_CONTRACT.md §5)
 *   - Results via listingsPublicApiClient.list(filter)
 */

import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize, spacing } from '../src/theme/theme';

export default function SearchScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>TODO: search — W2</Text>
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
});
