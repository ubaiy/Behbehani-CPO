/**
 * PhotoGalleryStrip — horizontal photo gradient placeholders + "View all" link.
 * Placeholders use brand color tints; +N overlay on the last tile.
 */

import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';

const PHOTO_GRADIENTS = [
  { background: brand[200] },
  { background: brand[300] },
  { background: brand[100] },
  { background: brand[200] },
  { background: brand[500], opacity: 0.5 },
  { background: brand[300] },
  { background: brand[200] },
];

interface Props {
  photoCount: number;
}

export function PhotoGalleryStrip({ photoCount }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.gallerySection}>
      <View style={styles.galleryHeader}>
        <Text style={styles.sectionLabel}>{t('inspection.photos.sectionLabel', { count: photoCount })}</Text>
        <TouchableOpacity
          onPress={() => console.log('[InspectionReport] View all photos — TODO')}
          accessibilityRole="link"
        >
          <Text style={styles.viewAllLink}>{t('inspection.photos.viewAll')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={[...PHOTO_GRADIENTS, { background: brand[900] }]}
        keyExtractor={(_, i) => String(i)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.galleryStrip}
        renderItem={({ item, index }) => {
          const isLast = index === PHOTO_GRADIENTS.length;
          return (
            <View
              style={[
                styles.photoThumb,
                { backgroundColor: item.background, opacity: (item as any).opacity ?? 1 },
              ]}
            >
              {isLast && (
                <View style={styles.photoOverlay}>
                  <Text style={styles.photoOverlayText}>+17</Text>
                </View>
              )}
            </View>
          );
        }}
      />
      <TouchableOpacity
        onPress={() => console.log('[InspectionReport] View all photos — TODO')}
        accessibilityRole="link"
        style={styles.viewAllButton}
      >
        <Text style={styles.viewAllLink}>{t('inspection.photos.viewAllCount', { count: photoCount })}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  gallerySection: { marginTop: 20, marginHorizontal: 16 },
  galleryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 11,
    color: slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  galleryStrip: { gap: 8 },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  photoOverlayText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '800',
    fontSize: 14,
    color: '#FFFFFF',
  },
  viewAllButton: { marginTop: 8, alignItems: 'center' },
  viewAllLink: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
    color: brand[700],
  },
});
