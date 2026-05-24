/**
 * ReviewsSection — VDP listing reviews aggregate + inline preview + write CTA.
 *
 * Task v0.19.c — extracted to keep [slug].tsx under 500 lines.
 *
 * Renders:
 *   1. ReviewsAggregate (average + histogram + total)
 *   2. Up to 3 most-recent reviews inline (ReviewListItem — no delete action)
 *   3. "See all N reviews" CTA — opens WriteReviewModal (for simplicity — modal
 *      is sufficient for the MVP; a full /listings/:slug/reviews screen can be
 *      added in a future sprint without breaking this component)
 *   4. "Write a review" CTA — always visible; if user is not signed in, shows
 *      an auth-required prompt inline (TODO: wire to real auth-state observer)
 *
 * The "See all" CTA uses the same pattern as other VDP sub-components — no
 * navigation, just scroll to expanded inline view via a simple showAll toggle.
 *
 * Auth note: we use a local `isSignedIn = false` stub (TODO v-next: wire to
 * auth context/observer). The CTA is always rendered — tapping when not signed
 * in shows an inline "Please sign in" prompt rather than silently failing.
 */

import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import type { ReviewDto } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../theme/colors';
import { listingReviewsApiClient } from '../../services/http';
import { ReviewsAggregate } from '../reviews/ReviewsAggregate';
import { ReviewListItem } from '../reviews/ReviewListItem';
import { WriteReviewModal } from '../reviews/WriteReviewModal';

// TODO (v-next): replace with real auth-state observer / context
const isSignedIn = false;

interface Props {
  listingId: string;
}

export function ReviewsSection({ listingId }: Props) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const [writeVisible, setWriteVisible] = useState(false);
  const [authPrompt, setAuthPrompt] = useState(false);

  const { data } = useQuery({
    queryKey: ['reviews', 'listing', listingId],
    queryFn: () => listingReviewsApiClient.listForListing(listingId, { page: 1, pageSize: 20 }),
    enabled: !!listingId,
    staleTime: 5 * 60 * 1000,
  });

  const reviews: ReviewDto[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const averageRating = data?.averageRating ?? 0;
  const histogram = data?.ratingHistogram ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  const displayed = showAll ? reviews : reviews.slice(0, 3);

  const handleWriteReview = useCallback(() => {
    if (!isSignedIn) {
      setAuthPrompt(true);
      return;
    }
    setWriteVisible(true);
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('reviews.write.cta')}</Text>

      {/* Aggregate */}
      <ReviewsAggregate
        averageRating={averageRating}
        total={total}
        histogram={histogram}
      />

      {/* Inline reviews */}
      {displayed.length > 0 ? (
        <View style={styles.list}>
          {displayed.map((r) => (
            <ReviewListItem key={r.id} review={r} />
          ))}
        </View>
      ) : null}

      {/* See all CTA */}
      {total > 3 && !showAll ? (
        <TouchableOpacity
          style={styles.seeAllBtn}
          onPress={() => setShowAll(true)}
          accessibilityRole="button"
        >
          <Text style={styles.seeAllText}>
            {t('common.seeAll')} {total} {t('reviews.list.title').toLowerCase()}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Write a review CTA */}
      <TouchableOpacity
        style={styles.writeCta}
        onPress={handleWriteReview}
        accessibilityRole="button"
        accessibilityLabel={t('reviews.write.ctaA11y')}
      >
        <Text style={styles.writeCtaText}>{t('reviews.write.cta')}</Text>
      </TouchableOpacity>

      {/* Auth prompt */}
      {authPrompt ? (
        <Text style={styles.authPrompt}>
          {t('common.signIn')} {t('reviews.write.cta').toLowerCase()}
        </Text>
      ) : null}

      {/* Write modal */}
      <WriteReviewModal
        visible={writeVisible}
        target={{ kind: 'listing', listingId }}
        onDismiss={() => setWriteVisible(false)}
        onSuccess={() => {
          setWriteVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingVertical: 4,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: slate[900],
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  list: {
    paddingTop: 4,
  },
  seeAllBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  seeAllText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: brand[700],
  },
  writeCta: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    minHeight: 48,
    backgroundColor: brand[50],
    borderWidth: 1.5,
    borderColor: brand[200],
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  writeCtaText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: brand[700],
  },
  authPrompt: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: slate[600],
    textAlign: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
});
