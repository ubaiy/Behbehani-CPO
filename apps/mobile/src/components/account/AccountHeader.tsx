/**
 * AccountHeader — sticky top bar with title + EN/AR language toggle.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { brand, slate } from '../../theme/colors';

interface Props {
  title: string;
  lang: 'en' | 'ar';
  onLangToggle: (l: 'en' | 'ar') => void;
}

export function AccountHeader({ title, lang, onLangToggle }: Props) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.langToggle}>
        <Pressable
          style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
          onPress={() => onLangToggle('en')}
          accessibilityRole="radio"
          accessibilityState={{ checked: lang === 'en' }}
        >
          <Text style={[styles.langBtnText, lang === 'en' && styles.langBtnTextActive]}>EN</Text>
        </Pressable>
        <Pressable
          style={[styles.langBtn, lang === 'ar' && styles.langBtnActive]}
          onPress={() => onLangToggle('ar')}
          accessibilityRole="radio"
          accessibilityState={{ checked: lang === 'ar' }}
        >
          <Text style={[styles.langBtnText, lang === 'ar' && styles.langBtnTextActive]}>عر</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: slate[200],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700',
    fontSize: 18,
    color: slate[900],
  },
  langToggle: {
    flexDirection: 'row',
    backgroundColor: slate[100],
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  langBtn: {
    height: 28,
    minWidth: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  langBtnText: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700',
    fontSize: 11,
    color: slate[500],
  },
  langBtnTextActive: {
    color: brand[900],
  },
});
