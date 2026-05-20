/**
 * StatusTimeline — vertical progress strip on the detail screen.
 *
 * Five canonical milestones derived from v1.4.2 §3:
 *   Reserved → Payment → Confirmed → Delivery → Completed
 *
 * Cancelled / failed renders the timeline in a muted state with a small inline
 * banner above the strip (handled at the screen level via the StatusPill).
 *
 * No amber/green per Task #65 — brand-700 for completed, slate-300 for upcoming.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { OrderStatusValue } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../theme/colors';

interface Props {
  status: OrderStatusValue;
}

interface Step {
  key: string;
  /** Status values at which this step is considered DONE. */
  doneOn: ReadonlyArray<OrderStatusValue>;
}

const STEPS: ReadonlyArray<Step> = [
  {
    key: 'step1',
    doneOn: [
      'reservation_pending',
      'payment_pending',
      'confirmed',
      'paid',
      'delivery_scheduled',
      'delivered',
      'completed',
    ],
  },
  {
    key: 'step2',
    doneOn: ['paid', 'confirmed', 'delivery_scheduled', 'delivered', 'completed'],
  },
  {
    key: 'step3',
    doneOn: ['confirmed', 'delivery_scheduled', 'delivered', 'completed'],
  },
  {
    key: 'step4',
    doneOn: ['delivery_scheduled', 'delivered', 'completed'],
  },
  {
    key: 'step5',
    doneOn: ['delivered', 'completed'],
  },
];

export function StatusTimeline({ status }: Props) {
  const { t } = useTranslation();
  const isCancelled = status === 'cancelled';

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{t('orders.timeline.heading')}</Text>
      {STEPS.map((step, idx) => {
        const done = !isCancelled && step.doneOn.includes(status);
        const isLast = idx === STEPS.length - 1;

        return (
          <View key={step.key} style={styles.row}>
            <View style={styles.indicatorColumn}>
              <View
                style={[
                  styles.dot,
                  done ? styles.dotDone : styles.dotPending,
                  isCancelled && styles.dotCancelled,
                ]}
              />
              {!isLast && (
                <View
                  style={[
                    styles.line,
                    done ? styles.lineDone : styles.linePending,
                    isCancelled && styles.lineCancelled,
                  ]}
                />
              )}
            </View>
            <View style={styles.labelColumn}>
              <Text
                style={[
                  styles.label,
                  done ? styles.labelDone : styles.labelPending,
                  isCancelled && styles.labelCancelled,
                ]}
              >
                {t(`orders.timeline.${step.key}`)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  heading: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: slate[900],
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 36,
  },
  indicatorColumn: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 9999,
    marginTop: 4,
  },
  dotDone: {
    backgroundColor: brand[700],
  },
  dotPending: {
    backgroundColor: slate[300],
  },
  dotCancelled: {
    backgroundColor: slate[300],
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  lineDone: {
    backgroundColor: brand[700],
  },
  linePending: {
    backgroundColor: slate[200],
  },
  lineCancelled: {
    backgroundColor: slate[200],
  },
  labelColumn: {
    flex: 1,
    marginStart: 12,
    paddingVertical: 4,
  },
  label: {
    fontSize: 14,
  },
  labelDone: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: slate[900],
  },
  labelPending: {
    fontFamily: 'PlusJakartaSans_500Medium',
    color: slate[500],
  },
  labelCancelled: {
    fontFamily: 'PlusJakartaSans_500Medium',
    color: slate[400],
    textDecorationLine: 'line-through',
  },
});
