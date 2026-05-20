/**
 * StepOneScheduleCard — "When works for you?" card.
 * 7-day FlatList date strip + 3 time-window cards (Morning/Afternoon/Evening).
 * Per CONCIERGE v0.2 §3a.
 */

import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import { DATE_CARDS } from './dateHelpers';
import type { SellFormState, PreferredWindow } from './types';

interface StepOneScheduleCardProps {
  selectedDate: SellFormState['selectedDate'];
  preferredWindow: SellFormState['preferredWindow'];
  onDateChange: (iso: string) => void;
  onWindowChange: (w: PreferredWindow) => void;
}

const TIME_WINDOWS = [
  { key: 'morning',   top: 'Morning',   sub: '8–12'  },
  { key: 'afternoon', top: 'Afternoon', sub: '12–4'  },
  { key: 'evening',   top: 'Evening',   sub: '4–8'   },
] as const;

export function StepOneScheduleCard({
  selectedDate,
  preferredWindow,
  onDateChange,
  onWindowChange,
}: StepOneScheduleCardProps) {
  return (
    <View style={ss.card}>
      <Text style={ss.cardH2}>When works for you?</Text>
      <Text style={ss.cardSub}>Pick a day and rough window. Our team confirms within 24h.</Text>

      {/* Horizontal date strip */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={DATE_CARDS}
        keyExtractor={(item) => item.iso}
        style={ss.dateStrip}
        contentContainerStyle={ss.dateStripContent}
        renderItem={({ item }) => {
          const isSelected = selectedDate === item.iso;
          return (
            <Pressable
              style={[ss.dateCard, isSelected && ss.dateCardSelected]}
              onPress={() => onDateChange(item.iso)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
            >
              <Text style={[ss.dateDayLabel, isSelected && ss.dateDayLabelSelected]}>
                {item.label}
              </Text>
              <Text style={[ss.dateDayNum, isSelected && ss.dateDayNumSelected]}>
                {item.dayNum}
              </Text>
              <Text style={[ss.dateMonth, isSelected && ss.dateMonthSelected]}>
                {item.month}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Time window strip */}
      <View style={ss.windowRow}>
        {TIME_WINDOWS.map(({ key, top, sub }) => {
          const sel = preferredWindow === key;
          return (
            <Pressable
              key={key}
              style={[ss.windowCard, sel && ss.windowCardSelected]}
              onPress={() => onWindowChange(key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: sel }}
            >
              <Text style={[ss.windowCardTop, sel && ss.windowCardTopSelected]}>{top}</Text>
              <Text style={[ss.windowCardSub, sel && ss.windowCardSubSelected]}>{sub}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: slate[200],
    padding: 16,
    gap: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardH2: {
    fontSize: 16,
    fontFamily: fontFamily.bold,
    color: slate[900],
  },
  cardSub: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: slate[500],
    marginTop: -6,
  },
  dateStrip: { marginTop: 0 },
  dateStripContent: { gap: 8, paddingVertical: 4 },
  dateCard: {
    width: 68,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 76,
  },
  dateCardSelected: {
    borderWidth: 2,
    borderColor: brand[700],
    backgroundColor: brand[50],
  },
  dateDayLabel: {
    fontSize: 9,
    fontFamily: fontFamily.bold,
    color: brand[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateDayLabelSelected: { color: brand[700] },
  dateDayNum: {
    fontSize: 20,
    fontFamily: fontFamily.bold,
    color: slate[900],
    lineHeight: 26,
    marginTop: 2,
  },
  dateDayNumSelected: { color: brand[900] },
  dateMonth: {
    fontSize: 10,
    fontFamily: fontFamily.regular,
    color: slate[400],
  },
  dateMonthSelected: { color: brand[700] },
  windowRow: { flexDirection: 'row', gap: 8 },
  windowCard: {
    flex: 1,
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: slate[200],
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  windowCardSelected: {
    borderColor: brand[700],
    backgroundColor: brand[50],
  },
  windowCardTop: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
    color: slate[900],
  },
  windowCardTopSelected: { color: brand[900] },
  windowCardSub: {
    fontSize: 10,
    fontFamily: fontFamily.regular,
    color: slate[400],
    marginTop: 2,
  },
  windowCardSubSelected: { color: brand[700] },
});
