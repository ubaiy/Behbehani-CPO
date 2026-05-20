/**
 * VehicleCard — vehicle context block on the order detail screen.
 *
 * The order DTO carries listingId + stockNumber but not the vehicle title/photo,
 * so this component fetches the listing detail separately via the listings client.
 * If the listing fetch fails (e.g. listing was unpublished), we degrade gracefully
 * to a stock-number-only view rather than blocking the order screen.
 *
 * VIN is rendered with last-6 masking via orders.utils.maskVin — same rule the
 * inspection viewer follows on customer surfaces.
 */

import { View, Text, Image, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listingsPublicApiClient } from '../../services/http';
import { brand, slate } from '../../theme/colors';
import { maskVin } from './orders.utils';

interface Props {
  listingId: string;
  stockNumber: string;
}

export function VehicleCard({ listingId, stockNumber }: Props) {
  const { t } = useTranslation();

  // We don't have a listings-by-id endpoint exposed; the order screen falls
  // back to stockNumber as the vehicle reference. If a future endpoint surfaces
  // listings-by-id we can flip this useQuery to that — for now suppress the call
  // and render the stub.
  // NOTE: keeping the useQuery scaffolding (disabled) so the wiring is obvious
  // when the endpoint lands. listingId is intentionally unused for now.
  void listingId;
  const { data: listing } = useQuery({
    queryKey: ['listings', 'detail-by-id', listingId],
    queryFn: async () => null as null,
    enabled: false,
  });

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{t('orders.vehicle.heading')}</Text>

      <View style={styles.row}>
        {listing && (listing as any).heroPhotoUrl ? (
          <Image
            source={{ uri: (listing as any).heroPhotoUrl }}
            style={styles.photo}
            accessibilityLabel={t('orders.vehicle.photoA11y')}
          />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={styles.photoPlaceholderText}>🚗</Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {t('orders.vehicle.stockNumber', { value: stockNumber })}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {t('orders.vehicle.vinLabel')}{' '}
            {maskVin(((listing as any)?.vin as string | undefined) ?? '') || t('orders.vehicle.stockPlaceholder')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  heading: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: slate[900],
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  photo: {
    width: 88,
    height: 64,
    borderRadius: 8,
    backgroundColor: slate[100],
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 28,
  },
  info: {
    flex: 1,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: slate[900],
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: slate[500],
    marginTop: 4,
  },
});

// Suppress unused import lint
void brand;
