/**
 * RichMediaSection — Walk-around video + 360° spin for the VDP.
 * Mobile v0.25 · Behbehani CPO Kuwait
 *
 * Props:
 *   walkaroundVideo  — from PublicListingDetailDto.walkaroundVideo (null if absent)
 *   spin360          — from PublicListingDetailDto.spin360 (null if absent)
 *   apiBaseUrl       — used to resolve relative /static/… URLs
 *
 * Render rules:
 *   - Both null → returns null (section header is not rendered)
 *   - Each sub-block is individually hidden when its field is null
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Video from 'react-native-video';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WalkaroundVideoDto {
  url: string;
  mimeType: string;
  posterUrl: string | null;
  durationS: number | null;
}

interface Spin360Dto {
  archiveUrl: string;
  mimeType: string;
  frameCount: number | null;
}

interface RichMediaSectionProps {
  walkaroundVideo: WalkaroundVideoDto | null | undefined;
  spin360: Spin360Dto | null | undefined;
  apiBaseUrl: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function absUrl(u: string, apiBase: string): string {
  return u.startsWith('/') ? `${apiBase}${u}` : u;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const VIDEO_HEIGHT = Math.round((SCREEN_WIDTH - 32) * (9 / 16)); // 16:9 within 16px side padding

// ─── Component ────────────────────────────────────────────────────────────────

export function RichMediaSection({ walkaroundVideo, spin360, apiBaseUrl }: RichMediaSectionProps) {
  const { t } = useTranslation();

  // Nothing to render — exit early without a section header
  if (!walkaroundVideo && !spin360) {
    return null;
  }

  return (
    <View style={styles.section}>
      {/* ── Walk-around video ─────────────────────────────────────────── */}
      {walkaroundVideo ? (
        <View style={styles.subBlock}>
          <Text style={styles.subHeading}>{t('vdp.richMedia.walkAroundTitle')}</Text>
          {walkaroundVideo.durationS != null && (
            <Text style={styles.durationLabel}>
              {t('vdp.richMedia.walkAroundDuration', { seconds: walkaroundVideo.durationS })}
            </Text>
          )}
          <View style={[styles.videoWrapper, { height: VIDEO_HEIGHT }]}>
            <Video
              source={{ uri: absUrl(walkaroundVideo.url, apiBaseUrl) }}
              poster={
                walkaroundVideo.posterUrl
                  ? absUrl(walkaroundVideo.posterUrl, apiBaseUrl)
                  : undefined
              }
              posterResizeMode="cover"
              resizeMode="contain"
              controls
              paused
              style={styles.videoPlayer}
            />
          </View>
        </View>
      ) : null}

      {/* ── 360° spin ─────────────────────────────────────────────────── */}
      {spin360 ? (
        <View style={styles.subBlock}>
          <Text style={styles.subHeading}>{t('vdp.richMedia.spin360Title')}</Text>
          {/* Slider not available — render placeholder note as per spec */}
          <View style={styles.spin360Placeholder}>
            <Text style={styles.spin360PlaceholderText}>
              {t('vdp.richMedia.spin360Hint')}
            </Text>
            <Text style={styles.spin360ComingSoon}>
              360° spin coming soon — drag scrubber TBD
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 20,
  },
  subBlock: {
    gap: 8,
  },
  subHeading: {
    fontSize: 15,
    fontFamily: fontFamily.semiBold,
    color: slate[900],
  },
  durationLabel: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: slate[500],
  },
  videoWrapper: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0F1629',
  },
  videoPlayer: {
    flex: 1,
  },
  spin360Placeholder: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: slate[50],
    gap: 6,
    paddingHorizontal: 16,
  },
  spin360PlaceholderText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: brand[700],
    textAlign: 'center',
  },
  spin360ComingSoon: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: slate[400],
    textAlign: 'center',
  },
});
