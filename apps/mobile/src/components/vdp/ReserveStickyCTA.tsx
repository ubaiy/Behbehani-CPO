/**
 * ReserveStickyCTA — sticky "Reserve now · KWD 100.000 · refundable · 48-hour hold" bar.
 * Extracted from apps/mobile/app/listings/[slug].tsx
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import { ChatIcon, PhoneIcon } from './vdp.icons';

interface ReserveStickyCTAProps {
  onReserve: () => void;
}

export function ReserveStickyCTA({ onReserve }: ReserveStickyCTAProps) {
  return (
    <View style={styles.stickyCTA}>
      <Text style={styles.stickyCTACaption}>Refundable hold — auto-expires in 48 hours</Text>
      <View style={styles.stickyCTARow}>
        <TouchableOpacity style={styles.stickyCTAIconBtn} accessibilityLabel="Message dealer">
          <ChatIcon color={slate[700]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.stickyCTAIconBtn} accessibilityLabel="Call dealer">
          <PhoneIcon />
        </TouchableOpacity>
        <TouchableOpacity style={styles.reserveBtn} onPress={onReserve} activeOpacity={0.85}>
          <Text style={styles.reserveBtnTitle}>Reserve now</Text>
          <Text style={styles.reserveBtnSubline}>KWD 100.000 · refundable · 48-hour hold</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stickyCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: slate[200],
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    zIndex: 30,
  },
  stickyCTACaption: {
    fontSize: 11,
    color: slate[500],
    textAlign: 'center',
    marginBottom: 6,
    fontFamily: fontFamily.regular,
  },
  stickyCTARow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stickyCTAIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: slate[200],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  reserveBtn: {
    flex: 1,
    height: 48,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: brand[800],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  reserveBtnTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fontFamily.bold,
    lineHeight: 18,
  },
  reserveBtnSubline: {
    color: brand[300],
    fontSize: 10,
    fontFamily: fontFamily.medium,
    lineHeight: 13,
  },
});
