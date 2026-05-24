/**
 * ImageWithFallback — drop-in replacement for <Image source={{ uri }}>
 * for any user-uploaded / listing photo URL.
 *
 * On S3 transient errors or cache races the image fires onError.
 * We swap it for a branded car silhouette placeholder so the UI
 * never shows a broken-image glyph.
 *
 * Usage:
 *   <ImageWithFallback source={{ uri: url }} style={styles.photo} resizeMode="cover" />
 *
 * All standard <Image> props are forwarded. When the image fails, the
 * fallback View inherits the same `style` prop so it fills the same slot.
 *
 * `fallbackSize` controls the CarSilhouette icon size (default 40).
 * `fallbackStyle` lets callers override the fallback container style.
 */

import React, { useState } from 'react';
import { Image, ImageProps, View, ViewStyle, StyleSheet, StyleProp } from 'react-native';
import { CarSilhouette } from '../vdp/vdp.icons';
import { brand } from '../../theme/colors';

export interface ImageWithFallbackProps extends ImageProps {
  fallbackSize?: number;
  fallbackStyle?: StyleProp<ViewStyle>;
}

export function ImageWithFallback({
  fallbackSize = 40,
  fallbackStyle,
  style,
  ...imageProps
}: ImageWithFallbackProps) {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageFailed) {
    return (
      <View style={[styles.fallback, style as ViewStyle, fallbackStyle]}>
        <CarSilhouette size={fallbackSize} color={brand[700]} />
      </View>
    );
  }

  return (
    <Image
      {...imageProps}
      style={style}
      onError={() => setImageFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: brand[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
