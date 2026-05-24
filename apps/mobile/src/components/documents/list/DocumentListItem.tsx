/**
 * DocumentListItem — single row card in the documents list (Task v0.17).
 *
 * Structure:
 *   [file glyph · document title          · kind pill]
 *   [uploaded date                         · file size]
 *
 * Touch target: entire row is the press target, minHeight ≥ 88px.
 * onPress is wired by the parent list screen which fetches the signed S3 URL
 * from the detail endpoint and then calls expo-web-browser.openBrowserAsync.
 */

import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { DocumentSummaryDto } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../../theme/colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a text glyph representing common MIME types. */
function mimeGlyph(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  return '📎';
}

/** Formats a byte count as a human-readable string (KB / MB). */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '';
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${Math.round(bytes / 1_024)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

/** Formats an ISO-8601 date string as DD/MM/YYYY. */
function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return iso;
  }
}

// ─── Kind pill ────────────────────────────────────────────────────────────────

function KindPill({ kind }: { kind: DocumentSummaryDto['kind'] }) {
  const { t } = useTranslation();
  return (
    <View style={pillStyles.container}>
      <Text style={pillStyles.label} numberOfLines={1}>
        {t(`documents.kind.${kind}`, { defaultValue: kind })}
      </Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  container: {
    backgroundColor: brand[700] + '18',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: brand[700],
    letterSpacing: 0.3,
  },
});

// ─── Row card ─────────────────────────────────────────────────────────────────

interface Props {
  document: DocumentSummaryDto;
  onPress: () => void;
  /** True while the signed URL is being fetched (shows inline loading hint). */
  isOpening?: boolean;
}

export function DocumentListItem({ document, onPress, isOpening = false }: Props) {
  const { t } = useTranslation();

  const glyph = mimeGlyph(document.mimeType);
  const sizeLabel = formatFileSize(document.fileSizeBytes);
  const dateLabel = formatShortDate(document.uploadedAt);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={isOpening}
      accessibilityRole="button"
      accessibilityLabel={t('documents.list.itemA11y', {
        title: document.title,
        kind: t(`documents.kind.${document.kind}`, { defaultValue: document.kind }),
      })}
      accessibilityHint={t('documents.list.openA11y')}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      {/* Row 1: glyph + title + kind pill */}
      <View style={styles.topRow}>
        <Text style={styles.glyph} accessibilityElementsHidden>
          {glyph}
        </Text>
        <Text style={styles.title} numberOfLines={2} selectable={false}>
          {document.title}
        </Text>
        <KindPill kind={document.kind} />
      </View>

      {/* Row 2: date + file size / opening hint */}
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {t('documents.meta.uploadedAt', { date: dateLabel })}
        </Text>
        {isOpening ? (
          <Text style={[styles.metaText, { color: brand[700] }]}>
            {'…'}
          </Text>
        ) : sizeLabel ? (
          <Text style={styles.metaText}>{sizeLabel}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 88,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  glyph: {
    fontSize: 26,
    lineHeight: 30,
  },
  title: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: slate[900],
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: slate[500],
  },
});
