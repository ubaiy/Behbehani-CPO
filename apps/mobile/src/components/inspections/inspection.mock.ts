/**
 * Mock data for the inspection-report viewer.
 * W3: replace with useQuery(['inspection', id]) calling
 * GET /v1/public/me/inspections/:id.
 */

import type { MockInspection } from './inspection.types';

export const MOCK: MockInspection = {
  vehicleTitle: '2021 Toyota Camry GLE',
  mileage: '42,500 km',
  transmission: 'Automatic',
  color: 'Pearl White',
  vinLastSix: 'A12345',
  bookingRef: 'BMC-CON-001234',
  inspectedOn: 'Mon, 19 May 2026',
  inspector: 'Ahmed K.',
  overallScore: 88,
  verdict: 'Very good condition',
  passCount: 63,
  advisoryCount: 7,
  failCount: 1,
  totalChecks: 71,
  categories: [
    {
      id: 'exterior',
      name: 'Exterior',
      score: 92,
      items: [
        { label: 'Body panels', status: 'pass' },
        { label: 'Paint uniformity', status: 'pass' },
        { label: 'Glass & windscreen', status: 'pass' },
        { label: 'Tires', status: 'pass' },
        { label: 'Exterior lights', status: 'pass' },
        {
          label: 'Rear bumper',
          status: 'fail',
          note: 'Minor scuff on driver-side rear bumper (see photo 14). Cosmetic only.',
        },
      ],
    },
    {
      id: 'mechanical',
      name: 'Mechanical',
      score: 85,
      items: [
        { label: 'Engine', status: 'pass' },
        { label: 'Transmission', status: 'pass' },
        { label: 'Suspension', status: 'pass' },
        { label: 'Brakes', status: 'pass' },
        { label: 'Battery', status: 'advisory', note: 'Battery at 87% — monitor; replace within 12 months.' },
        { label: 'Belts & fluids', status: 'pass' },
      ],
    },
    {
      id: 'electronic',
      name: 'Electronic',
      score: 90,
      items: [
        { label: 'Infotainment', status: 'pass' },
        { label: 'A/C system', status: 'pass' },
        { label: 'Safety sensors', status: 'pass' },
        { label: 'Interior lights', status: 'pass' },
        { label: 'ECU error codes', status: 'advisory', note: '1 non-critical ECU code cleared. No action required.' },
        { label: 'Interior lights', status: 'pass' },
      ],
    },
    {
      id: 'interior',
      name: 'Interior',
      score: 88,
      items: [
        { label: 'Seats & upholstery', status: 'pass' },
        { label: 'Dashboard', status: 'pass' },
        { label: 'Carpets & floor mats', status: 'pass' },
        { label: 'Door trims', status: 'pass' },
        { label: 'Headliner', status: 'advisory' },
        { label: 'Sun visor & mirrors', status: 'pass' },
      ],
    },
    {
      id: 'testdrive',
      name: 'Test Drive',
      score: 86,
      items: [
        { label: 'Acceleration', status: 'pass' },
        { label: 'Braking response', status: 'pass' },
        { label: 'Steering feel', status: 'pass' },
        { label: 'Wheel alignment', status: 'advisory', note: 'Minor pull to right. Alignment recommended at next service.' },
        { label: 'Cabin noise', status: 'pass' },
        { label: 'Idle smoothness', status: 'pass' },
      ],
    },
  ],
  photoCount: 25,
  inspectorNotes:
    'Vehicle is in very good overall condition. Single owner, full service history with Toyota dealer. Minor scuff on driver-side rear bumper (visible in photo 14). All electronics functional. Recommended for CPO certification.',
  inspectorNotesExtra:
    'Service history shows regular Toyota dealer servicing at 10k, 20k, 30k and 40k km intervals. No accident history reported. Paint scan shows original factory paint on all panels. Rear bumper scuff is cosmetic and does not affect structural integrity.',
  inspectorName: 'Ahmed K.',
  inspectorTitle: 'Senior Inspector',
  inspectorSignedAt: 'Mon 19 May 16:42',
  customerSignedAt: null, // toggle in dev: 'Mon 19 May 16:48'
  customerName: 'Abbas Behbehani',
  signatureMethod: 'in-person on inspector tablet',
  hasActiveOffer: true,
  offerAmountKwd: '4,850.000',
  offerValidDays: 7,
  offerExpiry: 'Mon 26 May 2026',
  offerToken: 'test-token-abc123',
};
