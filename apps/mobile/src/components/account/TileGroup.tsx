/**
 * TileGroup — section label + 2-col grid wrapper.
 */

import { View, Text, StyleSheet } from 'react-native';
import { slate } from '../../theme/colors';

interface Props {
  label: string;
  children: React.ReactNode;
}

export function TileGroup({ label, children }: Props) {
  return (
    <>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.tileGrid}>{children}</View>
    </>
  );
}

export function TileIconGlyph({ glyph }: { glyph: string }) {
  return <Text style={styles.tileIconGlyph}>{glyph}</Text>;
}

const styles = StyleSheet.create({
  sectionLabel: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700',
    fontSize: 11,
    color: slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tileGrid: {
    marginHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tileIconGlyph: {
    fontSize: 18,
  },
});
