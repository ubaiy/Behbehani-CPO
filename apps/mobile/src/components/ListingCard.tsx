/**
 * ListingCard — reusable listing card component.
 *
 * Variants:
 *   rail  — 240px wide, horizontal scroll rail (home screen)
 *   grid  — fills half the parent width (2-column grid, browse)
 *   list  — full width (list view, browse)
 *
 * Also exports ListingCard.Skeleton for loading states.
 *
 * Palette: white + brand (Royal Blue) + slate. Red only for filled-heart.
 */

import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { ListingPublicSummary } from '@behbehani-cpo/shared-types';
import { brand, slate, red } from '../theme/colors';
import { fontFamily, fontSize, radius, shadows, spacing } from '../theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ListingCardProps = {
  listing: ListingPublicSummary;
  variant?: 'rail' | 'grid' | 'list';
  showFavorite?: boolean;
  onFavoriteToggle?: (listingId: string) => void;
  onPress?: (listing: ListingPublicSummary) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKwd(fils: string): string {
  const num = parseInt(fils, 10);
  if (isNaN(num)) return '—';
  return `KWD ${(num / 1000).toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })}`;
}

function formatKwdAmount(fils: string): string {
  const num = parseInt(fils, 10);
  if (isNaN(num)) return '';
  return (num / 1000).toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

// ─── HeartIcon ────────────────────────────────────────────────────────────────

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <View style={styles.heartIcon}>
      <Text style={[styles.heartSymbol, filled && styles.heartFilled]}>
        {filled ? '♥' : '♡'}
      </Text>
    </View>
  );
}

// ─── PhotoArea ────────────────────────────────────────────────────────────────

function PhotoArea({
  heroPhotoUrl,
  inspected,
  badge,
  isPriceDrop,
}: {
  heroPhotoUrl: string | null;
  inspected: boolean;
  badge: ListingPublicSummary['badge'];
  isPriceDrop: boolean;
}) {
  const { t } = useTranslation();
  const hasBadge = inspected || (badge !== null && badge !== 'priceDrop');
  const badgeLabel = inspected
    ? t('listings.badge.cpoInspected')
    : badge === 'lowMileage'
    ? t('listings.badge.lowMileageBadge')
    : badge === 'recentlyAdded'
    ? t('listings.badge.recentlyAddedBadge')
    : badge === 'premium'
    ? t('listings.badge.premiumBadge')
    : null;

  return (
    <View style={styles.photoArea}>
      {heroPhotoUrl ? (
        <Image
          source={{ uri: heroPhotoUrl }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={styles.photoPlaceholder} />
      )}

      {/* Badge top-left */}
      {hasBadge && badgeLabel ? (
        <View style={styles.photoBadgeRow}>
          <View style={styles.photoBadge}>
            <Text style={styles.photoBadgeText}>{badgeLabel}</Text>
          </View>
        </View>
      ) : null}

      {/* Price-drop badge */}
      {isPriceDrop ? (
        <View style={styles.photoBadgeRow}>
          <View style={[styles.photoBadge, styles.priceDropBadge]}>
            <Text style={styles.photoBadgeText}>{t('listings.badge.priceDropBadge')}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ─── ListingCard ──────────────────────────────────────────────────────────────

function ListingCard({
  listing,
  variant = 'rail',
  showFavorite = false,
  onFavoriteToggle,
  onPress,
}: ListingCardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const isPriceDrop = listing.badge === 'priceDrop';

  const cardStyle =
    variant === 'rail'
      ? styles.cardRail
      : variant === 'grid'
      ? styles.cardGrid
      : styles.cardList;

  function handlePress() {
    if (onPress) {
      onPress(listing);
    } else {
      // `as any` is the codebase convention for dynamic expo-router paths
      // (typed-routes can't infer template-literal slugs). Matches the 8 other
      // sites in apps/mobile/app/** that route to dynamic segments.
      router.push(`/listings/${listing.slug}` as any);
    }
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.cardBase, cardStyle, pressed && styles.cardPressed]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${listing.titleEn}, ${formatKwd(listing.priceFils)}`}
    >
      {/* Photo */}
      <PhotoArea
        heroPhotoUrl={listing.heroPhotoUrl}
        inspected={listing.inspected}
        badge={listing.badge}
        isPriceDrop={isPriceDrop}
      />

      {/* Favorite button */}
      {showFavorite && (
        <Pressable
          style={styles.favButton}
          onPress={() => onFavoriteToggle?.(listing.id)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('listings.toggleFavoriteA11y')}
        >
          <HeartIcon filled={false} />
        </Pressable>
      )}

      {/* Info block */}
      <View style={styles.infoBlock}>
        <Text style={styles.metaLine} numberOfLines={1}>
          {listing.year} · {listing.mileageKm.toLocaleString('en-US')} {t('listings.kmShort')}
        </Text>

        <Text style={styles.titleLine} numberOfLines={2}>
          {listing.year} {listing.brand.nameEn} {listing.model.nameEn}
          {listing.titleEn
            .replace(String(listing.year), '')
            .replace(listing.brand.nameEn, '')
            .replace(listing.model.nameEn, '')
            .trim()
            ? ` ${listing.titleEn
                .replace(String(listing.year), '')
                .replace(listing.brand.nameEn, '')
                .replace(listing.model.nameEn, '')
                .trim()}`
            : ''}
        </Text>

        <View style={styles.priceRow}>
          <View>
            {/* Price-drop strikethrough: shows the ORIGINAL price (previousPriceFils)
                with strikethrough, with the current discounted price below. Per
                CONCIERGE v1.4.5 §6 [ASK C→A] A-1 — previousPriceFils shipped. */}
            {isPriceDrop && listing.previousPriceFils ? (
              <Text style={styles.priceStruck} numberOfLines={1}>
                {formatKwd(listing.previousPriceFils)}
              </Text>
            ) : null}
            <Text style={styles.price} numberOfLines={1}>
              {formatKwd(listing.priceFils)}
            </Text>
          </View>
          <Text style={styles.monthly} numberOfLines={1}>
            {formatKwdAmount(listing.monthlyFils)
              ? t('listings.fromMonthly', { value: formatKwdAmount(listing.monthlyFils) })
              : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBlock({ style }: { style: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.View style={[styles.skelBlock, style, { opacity }]} />;
}

function ListingCardSkeleton({ variant = 'rail' }: { variant?: 'rail' | 'grid' | 'list' }) {
  const cardStyle =
    variant === 'rail'
      ? styles.cardRail
      : variant === 'grid'
      ? styles.cardGrid
      : styles.cardList;

  return (
    <View style={[styles.cardBase, cardStyle]}>
      <SkeletonBlock style={styles.skelPhoto} />
      <View style={styles.infoBlock}>
        <SkeletonBlock style={styles.skelLine1} />
        <SkeletonBlock style={styles.skelLine2} />
        <SkeletonBlock style={styles.skelLine3} />
      </View>
    </View>
  );
}

// Attach Skeleton as a static property and export
const ListingCardWithSkeleton = Object.assign(ListingCard, {
  Skeleton: ListingCardSkeleton,
});

export { ListingCardWithSkeleton as ListingCard };

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Card containers
  cardBase: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: slate[200],
    overflow: 'hidden',
    ...shadows.md,
  },
  cardRail: {
    width: 240,
    flexShrink: 0,
  },
  cardGrid: {
    flex: 1,
  },
  cardList: {
    width: '100%',
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },

  // Photo area (16:10 aspect, enforced via paddingTop trick)
  photoArea: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: brand[100],
  },
  photoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: brand[100],
  },
  photoBadgeRow: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
    flexDirection: 'row',
    gap: spacing[1],
  },
  photoBadge: {
    backgroundColor: brand[900],
    borderRadius: radius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  priceDropBadge: {
    backgroundColor: red[700],
  },
  photoBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // Favorite button
  favButton: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartSymbol: {
    fontSize: 16,
    color: brand[700],
  },
  heartFilled: {
    color: red[500],
  },

  // Info block
  infoBlock: {
    padding: spacing[3],
  },
  metaLine: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: slate[500],
    marginBottom: 2,
  },
  titleLine: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    color: slate[900],
    lineHeight: 20,
    marginBottom: spacing[2],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  priceStruck: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: slate[400],
    textDecorationLine: 'line-through',
    lineHeight: 14,
  },
  price: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: brand[900],
    lineHeight: 20,
  },
  monthly: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: slate[500],
    alignSelf: 'flex-end',
  },

  // Skeleton blocks
  skelBlock: {
    backgroundColor: slate[200],
    borderRadius: radius.md,
  },
  skelPhoto: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 0,
  },
  skelLine1: {
    height: 12,
    width: '40%',
    marginBottom: spacing[2],
  },
  skelLine2: {
    height: 16,
    width: '75%',
    marginBottom: spacing[2],
  },
  skelLine3: {
    height: 20,
    width: '60%',
  },
});
