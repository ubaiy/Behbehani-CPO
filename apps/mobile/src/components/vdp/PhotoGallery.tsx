/**
 * PhotoGallery — hero FlatList + thumbnail strip + photo counter + 360 stub overlay.
 * Extracted from apps/mobile/app/listings/[slug].tsx
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import { CarSilhouette } from './vdp.icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GALLERY_HEIGHT = SCREEN_WIDTH * (10 / 16); // 16:10 ratio

interface PhotoGalleryProps {
  photos: string[];
  currentPhoto: number;
  totalPhotos: number;
  onScroll: (e: any) => void;
  onThumbnailPress: (idx: number) => void;
}

export function PhotoGallery({
  photos,
  currentPhoto,
  totalPhotos,
  onScroll,
  onThumbnailPress,
}: PhotoGalleryProps) {
  const { t } = useTranslation();
  return (
    <>
      {/* Hero gallery */}
      <View style={styles.galleryContainer}>
        <FlatList
          data={photos.length > 0 ? photos : ['placeholder']}
          keyExtractor={(item, idx) => `${item}-${idx}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={styles.galleryList}
          renderItem={({ item }) =>
            item === 'placeholder' ? (
              <View style={[styles.gallerySlide, styles.galleryPlaceholder]}>
                <CarSilhouette />
              </View>
            ) : (
              <View style={styles.gallerySlide}>
                <Image source={{ uri: item }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              </View>
            )
          }
        />

        {/* Photo counter */}
        <View style={styles.photoCounter} pointerEvents="none">
          <Text style={styles.photoCounterText}>
            {t('vdp.photoCounter', { current: currentPhoto + 1, total: totalPhotos })}
          </Text>
        </View>

        {/* 360° View stub */}
        <View style={styles.view360Btn} pointerEvents="none">
          <Text style={styles.view360Text}>{t('vdp.view360')}</Text>
        </View>
      </View>

      {/* Thumbnail strip */}
      <View style={styles.thumbnailSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailRow}
        >
          {(photos.length > 0 ? photos : Array.from({ length: 6 }, (_, i) => `thumb-${i}`)).map(
            (photo, idx) => (
              <TouchableOpacity
                key={`thumb-${idx}`}
                style={[
                  styles.thumbnail,
                  idx === currentPhoto ? styles.thumbnailActive : styles.thumbnailInactive,
                ]}
                onPress={() => onThumbnailPress(idx)}
                activeOpacity={0.8}
              >
                {typeof photo === 'string' && photo.startsWith('http') ? (
                  <Image source={{ uri: photo }} style={styles.thumbnailImage} resizeMode="cover" />
                ) : (
                  <View style={styles.thumbnailPlaceholder} />
                )}
              </TouchableOpacity>
            ),
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  galleryContainer: {
    width: SCREEN_WIDTH,
    height: GALLERY_HEIGHT,
    backgroundColor: brand[100],
    position: 'relative',
  },
  galleryList: {
    width: SCREEN_WIDTH,
    height: GALLERY_HEIGHT,
  },
  gallerySlide: {
    width: SCREEN_WIDTH,
    height: GALLERY_HEIGHT,
    overflow: 'hidden',
  },
  galleryPlaceholder: {
    backgroundColor: brand[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCounter: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  photoCounterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
  },
  view360Btn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  view360Text: {
    color: slate[400],
    fontSize: 11,
    fontFamily: fontFamily.bold,
  },
  thumbnailSection: {
    paddingVertical: 12,
    paddingLeft: 16,
    backgroundColor: '#FFFFFF',
  },
  thumbnailRow: {
    gap: 8,
    paddingRight: 16,
  },
  thumbnail: {
    width: 64,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
  },
  thumbnailActive: {
    borderColor: brand[700],
  },
  thumbnailInactive: {
    borderColor: 'transparent',
    opacity: 0.7,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    backgroundColor: brand[100],
  },
});
