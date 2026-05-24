/**
 * BookingTimeline — 4-step vertical timeline for the sell-concierge tracker.
 *
 * Steps (mirrors A's TrackerTimelineComponent):
 *   1. Booking received  — always done once DTO loaded
 *   2. Inspector assigned — derived from inspectorAssigned flag
 *   3. Inspection on-site — status === 'in_progress'
 *   4. Sign + offer       — awaiting_customer_signature / signed_off
 *
 * Brand-lock: brand-700 for done/active nodes — NOT emerald/amber/green.
 * Pending nodes: white with border-line + step number.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ConciergeBookingStatus, InspectionStatus } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../theme/colors';

type StepState = 'done' | 'active' | 'pending';

function stepState(
  step: 'assigned' | 'inspection' | 'sign',
  status: InspectionStatus,
  inspectorAssigned: boolean,
): StepState {
  switch (step) {
    case 'assigned':
      if (
        status === 'in_progress' ||
        status === 'awaiting_inspector_signoff' ||
        status === 'awaiting_customer_signature' ||
        status === 'signed_off'
      )
        return 'done';
      return inspectorAssigned || status === 'draft' ? 'active' : 'pending';
    case 'inspection':
      if (
        status === 'awaiting_inspector_signoff' ||
        status === 'awaiting_customer_signature' ||
        status === 'signed_off'
      )
        return 'done';
      if (status === 'in_progress') return 'active';
      return 'pending';
    case 'sign':
      if (status === 'signed_off') return 'done';
      if (status === 'awaiting_customer_signature') return 'active';
      return 'pending';
  }
}

interface NodeProps {
  state: StepState;
  stepNum: number;
}

function TimelineNode({ state, stepNum }: NodeProps) {
  if (state === 'done') {
    return (
      <View style={[styles.node, styles.nodeDone]}>
        <Text style={styles.nodeCheck}>✓</Text>
      </View>
    );
  }
  if (state === 'active') {
    return (
      <View style={[styles.node, styles.nodeActive]}>
        <View style={styles.nodePulse} />
      </View>
    );
  }
  return (
    <View style={[styles.node, styles.nodePending]}>
      <Text style={styles.nodeNum}>{stepNum}</Text>
    </View>
  );
}

interface Props {
  data: ConciergeBookingStatus | null;
  formatDate: (iso: string) => string;
}

export function BookingTimeline({ data, formatDate }: Props) {
  const { t } = useTranslation();

  const status: InspectionStatus = data?.status ?? 'draft';
  const inspectorAssigned = data?.inspectorAssigned ?? false;

  const assignedState = stepState('assigned', status, inspectorAssigned);
  const inspectionState = stepState('inspection', status, inspectorAssigned);
  const signState = stepState('sign', status, inspectorAssigned);

  const preferredDate =
    data?.customerPreference?.preferredDate
      ? formatDate(data.customerPreference.preferredDate)
      : null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>
        {t('sellTracker.timeline.label', 'PROGRESS')}
      </Text>

      <View style={styles.timeline}>
        {/* Connector line */}
        <View style={styles.connector} />

        {/* Step 1 — Booking received (always done) */}
        <View style={styles.stepRow}>
          <View style={[styles.node, styles.nodeDone]}>
            <Text style={styles.nodeCheck}>✓</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>
              {t('sellTracker.timeline.step1', 'Booking received')}
            </Text>
            {preferredDate ? (
              <Text style={styles.stepSub}>{preferredDate}</Text>
            ) : null}
          </View>
        </View>

        {/* Step 2 — Inspector assigned */}
        <View style={[styles.stepRow, assignedState === 'pending' && styles.stepDimmed]}>
          <TimelineNode state={assignedState} stepNum={2} />
          <View style={styles.stepContent}>
            <View style={styles.stepTitleRow}>
              <Text style={[styles.stepTitle, assignedState === 'pending' && styles.textDimmed]}>
                {t('sellTracker.timeline.step2', 'Inspector assigned')}
              </Text>
              {assignedState === 'active' ? (
                <View style={styles.inProgressBadge}>
                  <Text style={styles.inProgressBadgeText}>
                    {t('sellTracker.timeline.inProgress', 'IN PROGRESS')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Step 3 — Inspection on-site */}
        <View style={[styles.stepRow, inspectionState === 'pending' && styles.stepDimmed]}>
          <TimelineNode state={inspectionState} stepNum={3} />
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, inspectionState === 'pending' && styles.textDimmed]}>
              {t('sellTracker.timeline.step3', 'Inspection on-site')}
            </Text>
            {preferredDate && inspectionState !== 'pending' ? (
              <Text style={styles.stepSub}>
                {preferredDate}
                {data?.customerPreference?.window
                  ? ` · ${t(`sell.step1.schedule.window.${data.customerPreference.window}`, data.customerPreference.window)}`
                  : ''}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Step 4 — Sign + offer */}
        <View style={[styles.stepRow, signState === 'pending' && styles.stepDimmed]}>
          <TimelineNode state={signState} stepNum={4} />
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, signState === 'pending' && styles.textDimmed]}>
              {t('sellTracker.timeline.step4', 'Sign & receive offer')}
            </Text>
            <Text style={styles.stepSub}>
              {t('sellTracker.timeline.step4Sub', 'Your cash offer arrives within 24h.')}
            </Text>
          </View>
        </View>
      </View>

      {/* Sign-link available callout */}
      {data?.signLinkAvailable ? (
        <View style={styles.signReady}>
          <Text style={styles.signReadyTitle}>
            {t('sellTracker.signReady.title', 'Your signature is ready')}
          </Text>
          <Text style={styles.signReadySub}>
            {t('sellTracker.signReady.sub', 'Check your SMS or email for the secure signing link.')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: slate[200],
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: slate[500],
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  timeline: {
    position: 'relative',
    gap: 0,
  },
  connector: {
    position: 'absolute',
    left: 15,
    top: 16,
    bottom: 16,
    width: 2,
    backgroundColor: slate[200],
    zIndex: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingBottom: 20,
    zIndex: 1,
  },
  stepDimmed: {
    opacity: 0.55,
  },
  node: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    zIndex: 2,
  },
  nodeDone: {
    backgroundColor: brand[700],
  },
  nodeActive: {
    backgroundColor: brand[700],
    // Ring effect via shadow — React Native doesn't support CSS ring.
    shadowColor: brand[300],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  nodePending: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: slate[200],
  },
  nodeCheck: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
  },
  nodePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  nodeNum: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: slate[500],
  },
  stepContent: {
    flex: 1,
    paddingTop: 6,
    gap: 3,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  stepTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: slate[900],
  },
  textDimmed: {
    color: slate[400],
  },
  stepSub: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: slate[500],
    lineHeight: 16,
  },
  inProgressBadge: {
    backgroundColor: brand[50],
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inProgressBadgeText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 9,
    color: brand[700],
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  signReady: {
    marginTop: 12,
    backgroundColor: brand[50],
    borderRadius: 10,
    padding: 12,
  },
  signReadyTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: brand[800],
    marginBottom: 3,
  },
  signReadySub: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: brand[700],
    lineHeight: 16,
  },
});
