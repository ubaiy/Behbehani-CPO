/**
 * WalkaroundVideoStub — "Walkaround video · Coming soon" card.
 * Extracted from apps/mobile/app/listings/[slug].tsx
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import { PlayIcon } from './vdp.icons';

export function WalkaroundVideoStub() {
  return (
    <View style={styles.sectionPadded}>
      <View style={styles.videoCard}>
        <View style={styles.videoPlayBtn}>
          <PlayIcon />
        </View>
        <View style={styles.videoTextBlock}>
          <Text style={styles.videoTitle}>Walkaround video · Coming soon</Text>
          <Text style={styles.videoSubtitle}>Inspector-narrated exterior + interior tour</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionPadded: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  videoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#0F1629',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  videoPlayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  videoTextBlock: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
  },
  videoSubtitle: {
    fontSize: 11,
    color: brand[200],
    marginTop: 2,
  },
});
