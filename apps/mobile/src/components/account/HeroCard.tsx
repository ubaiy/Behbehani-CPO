/**
 * HeroCard — gradient bg + 72px avatar + fullName + email/mobile +
 * "Member since" + quick sign-out icon.
 *
 * Uses expo-linear-gradient when available; falls back to solid brand[900].
 */

import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand } from '../../theme/colors';

// Guarded import — same pattern as expo-image-picker / expo-notifications.
let LinearGradient: any;
try {
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch {
  // eslint-disable-next-line react/display-name
  LinearGradient = ({ children, style }: { children: React.ReactNode; style?: any }) => (
    <View style={[style, { backgroundColor: brand[900] }]}>{children}</View>
  );
}

interface Props {
  fullName: string;
  email?: string | null;
  mobile?: string | null;
  avatarUrl?: string | null;
  initials: string;
  memberSince: string;
  lastSignIn: string;
  onSignOut: () => void;
}

export function HeroCard({
  fullName,
  email,
  mobile,
  avatarUrl,
  initials,
  memberSince,
  lastSignIn,
  onSignOut,
}: Props) {
  const { t } = useTranslation();
  return (
    <LinearGradient
      colors={[brand[900], brand[700], brand[600]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      <View style={styles.heroLeft}>
        <View style={styles.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitials}>{initials}</Text>
          )}
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{fullName}</Text>
          {email && <Text style={styles.heroEmail}>{email}</Text>}
          {mobile && <Text style={styles.heroMobile}>{mobile}</Text>}
          <Text style={styles.heroMeta}>
            {t('account.hero.memberSince', { date: memberSince })}
            {' · '}
            {t('account.hero.lastSignIn', { ago: lastSignIn })}
          </Text>
        </View>
      </View>
      <Pressable
        style={styles.heroSignOut}
        onPress={onSignOut}
        accessibilityLabel={t('account.hero.signOutA11y')}
        accessibilityRole="button"
      >
        <Text style={styles.heroSignOutIcon}>{'↪'}</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarInitials: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700',
    fontSize: 22,
    color: brand[900],
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700',
    fontSize: 17,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  heroEmail: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '400',
    fontSize: 12,
    color: 'rgba(255,255,255,0.80)',
    marginTop: 4,
  },
  heroMobile: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '400',
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  heroMeta: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '400',
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
  },
  heroSignOut: {
    flexShrink: 0,
    marginTop: 2,
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  heroSignOutIcon: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.75)',
  },
});
