import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamily, radius } from '../../theme/theme';
import { SLATE_200, SLATE_500, BRAND_900 } from './authConstants';

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language?.startsWith('ar') ? 'ar' : 'en';

  function toggleLanguage() {
    const next = currentLang === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(next).catch(() => {
      // i18n not yet ready — noop
    });
  }

  return (
    <View style={styles.langToggle} accessibilityRole="radiogroup" accessibilityLabel={t('auth.languageA11y')}>
      <Pressable
        style={[styles.langBtn, currentLang === 'en' && styles.langBtnActive]}
        onPress={toggleLanguage}
        accessibilityRole="radio"
        accessibilityState={{ checked: currentLang === 'en' }}
      >
        <Text style={[styles.langBtnText, currentLang === 'en' && styles.langBtnTextActive]}>EN</Text>
      </Pressable>
      <Pressable
        style={[styles.langBtn, currentLang === 'ar' && styles.langBtnActive]}
        onPress={toggleLanguage}
        accessibilityRole="radio"
        accessibilityState={{ checked: currentLang === 'ar' }}
      >
        <Text style={[styles.langBtnText, currentLang === 'ar' && styles.langBtnTextActive]}>العربية</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  langToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: SLATE_200,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  langBtn: {
    paddingHorizontal: 12,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langBtnActive: {
    backgroundColor: BRAND_900,
  },
  langBtnText: {
    fontSize: 11,
    fontFamily: fontFamily.bold,
    color: SLATE_500,
  },
  langBtnTextActive: {
    color: '#FFFFFF',
  },
});
