/**
 * PendingActionsStrip — horizontal scroll of pending-action cards.
 * Maintenance-due card hidden until v1.5 per v1.3.2 §5.
 */

import { FlatList, I18nManager, Pressable, Text, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';
import { router } from 'expo-router';

export interface PendingCard {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  /** TODO v1.5: hide maintenance-due card until subsystem ships per v1.3.2 §5 */
  hidden?: boolean;
}

// Static mock data — W3 wires to /me/inspections.latestOffer
// NOTE: title/subtitle are translation keys resolved at render time via getPendingCards()
export const PENDING_CARDS: PendingCard[] = [
  {
    id: 'offer-1',
    title: 'account.pendingActions.offerTitle',
    subtitle: 'account.pendingActions.offerSubtitle',
    route: '/listings/test-slug',
  },
  {
    // TODO v1.5: hide maintenance-due card until subsystem ships per v1.3.2 §5
    id: 'maintenance-1',
    title: 'account.pendingActions.maintenanceTitle',
    subtitle: 'account.pendingActions.maintenanceSubtitle',
    route: '/account/coming-soon?feature=maintenance',
  },
];

interface Props {
  cards?: PendingCard[];
}

export function PendingActionsStrip({ cards = PENDING_CARDS }: Props) {
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;

  return (
    <>
      <Text style={styles.sectionLabel}>{t('account.pendingActions.heading')}</Text>
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(item.route as Parameters<typeof router.push>[0])}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardIconWrap}>
                <Text style={styles.cardIconText}>{'$'}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{t(item.title)}</Text>
                <Text style={styles.cardSubtitle}>{t(item.subtitle)}</Text>
              </View>
            </View>
            <Text style={styles.cardCta}>{t('account.pendingActions.viewCta', { arrow: isRTL ? '←' : '→' })}</Text>
          </Pressable>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700',
    fontSize: 11,
    color: slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  strip: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  card: {
    minWidth: 260,
    backgroundColor: brand[50],
    borderWidth: 1,
    borderColor: brand[200],
    borderRadius: 16,
    padding: 12,
    flexShrink: 0,
  },
  cardPressed: {
    backgroundColor: brand[100],
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: brand[100],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardIconText: {
    fontSize: 16,
    color: brand[700],
    fontWeight: '700',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '600',
    fontSize: 13,
    color: slate[900],
  },
  cardSubtitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '400',
    fontSize: 11,
    color: slate[500],
    marginTop: 2,
  },
  cardCta: {
    alignSelf: 'flex-end',
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700',
    fontSize: 12,
    color: brand[700],
    marginTop: 8,
  },
});
