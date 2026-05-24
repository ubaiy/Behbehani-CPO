/**
 * Inspection service tests — state machine, signoff branching, customer
 * signature flow, audit emission. Repo + notifications + audit are mocked
 * at the module boundary so we exercise the orchestration logic.
 */

import {
  INSPECTION_RUBRIC,
  INSPECTION_RUBRIC_TOTAL,
  type InspectionItemResult,
} from '@behbehani-cpo/shared-types';

// ─── Mocks (must come before service import) ───────────────────────────────

jest.mock('./inspections.repo', () => ({
  listInspections: jest.fn(),
  findInspectionById: jest.fn(),
  findInspectionByBookingRef: jest.fn(),
  findInspectionBySignToken: jest.fn(),
  findInspectionByListingId: jest.fn(),
  findCustomerByMobileOrEmail: jest.fn(),
  createGhostCustomer: jest.fn(),
  nextBookingRef: jest.fn(),
  createInspection: jest.fn(),
  updateInspection: jest.fn(),
  readReportJson: jest.requireActual('./inspections.repo').readReportJson,
}));

const recordAuditMock = jest.fn().mockResolvedValue(undefined);
jest.mock('../middleware/audit', () => ({
  recordAudit: (...args: unknown[]) => recordAuditMock(...args),
  auditMutation: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const sendSignLinkSmsMock = jest.fn().mockResolvedValue({ providerMessageId: 'sms-1' });
const sendSignLinkEmailMock = jest.fn().mockResolvedValue({ providerMessageId: 'email-1' });
jest.mock('../notifications/notifications.service', () => ({
  sendSignLinkSms: (...args: unknown[]) => sendSignLinkSmsMock(...args),
  sendSignLinkEmail: (...args: unknown[]) => sendSignLinkEmailMock(...args),
  buildSignLinkUrl: (token: string) => `http://localhost:4200/inspection-sign/${token}`,
}));

// Stub the S3 helper so the photo-hydration test has a stable base URL and
// doesn't depend on the real env config.
jest.mock('../lib/s3', () => ({
  publicUrl: (key: string) => `http://localhost:9000/cpo-media/${key}`,
}));

// F2: mock listings.service so CPO signoff tests don't require a real listings DB.
const changeListingStageMock = jest.fn().mockResolvedValue({ id: 'listing-1', stage: 'photoshoot' });
jest.mock('../listings/listings.service', () => ({
  changeStage: (...args: unknown[]) => changeListingStageMock(...args),
}));

// Task #66 (2026-05-21): mock the pdf-worker so this spec doesn't open a real
// BullMQ Redis socket on import (the worker module instantiates a Queue against
// `redisClient()` at module-load time). Without this mock, jest emits
// "A worker process has failed to exit gracefully" because the socket lingers
// past the test run. The signoff flow only needs `enqueueInspectionReportPdf`
// to be callable — its dispatch is fire-and-forget from inspections.service.
jest.mock('../jobs/pdf-worker', () => ({
  enqueueInspectionReportPdf: jest.fn().mockResolvedValue(undefined),
}));

import * as repo from './inspections.repo';
import {
  createConciergeInspection,
  saveProgress,
  signoff,
  submitCustomerSignature,
  resendSignLink,
  revokeSignLink,
  getInspectionBySignToken,
  getInspectionByBookingRef,
  hydrateReportPhotoUrls,
} from './inspections.service';
import { InspectionError } from './inspections.errors';

const findById = repo.findInspectionById as jest.MockedFunction<typeof repo.findInspectionById>;
const findByBookingRef = repo.findInspectionByBookingRef as jest.MockedFunction<typeof repo.findInspectionByBookingRef>;
const findByToken = repo.findInspectionBySignToken as jest.MockedFunction<typeof repo.findInspectionBySignToken>;
const findCustomerByMobileOrEmail = repo.findCustomerByMobileOrEmail as jest.MockedFunction<typeof repo.findCustomerByMobileOrEmail>;
const createGhostCustomer = repo.createGhostCustomer as jest.MockedFunction<typeof repo.createGhostCustomer>;
const nextBookingRef = repo.nextBookingRef as jest.MockedFunction<typeof repo.nextBookingRef>;
const createInspection = repo.createInspection as jest.MockedFunction<typeof repo.createInspection>;
const updateInspection = repo.updateInspection as jest.MockedFunction<typeof repo.updateInspection>;

// ─── Fixtures ──────────────────────────────────────────────────────────────

function allItemsScored(): InspectionItemResult[] {
  return INSPECTION_RUBRIC.flatMap((section) =>
    section.items.map((item) => ({
      itemId: item.id,
      status: 'pass' as const,
      photoKeys: [],
    })),
  );
}

function row(overrides: Record<string, unknown> = {}): any {
  const now = new Date('2026-05-18T12:00:00.000Z');
  return {
    id: 'insp-1',
    kind: 'cpo',
    status: 'awaiting_inspector_signoff',
    listingId: 'listing-1',
    listing: { id: 'listing-1', stockNumber: 'BCPO-2026-0042', titleEn: '2023 Camry', vin: '1HGBH41JXMN109186' },
    customerId: null,
    customer: null,
    bookingRef: null,
    vehicleYear: null,
    vehicleBrandName: null,
    vehicleModelName: null,
    vehicleVin: null,
    vehicleMileageKm: null,
    vehicleTransmission: null,
    locationAddress: null,
    locationGovernorate: null,
    locationLat: null,
    locationLng: null,
    customerPreferredDate: null,
    customerPreferredWindow: null,
    scheduledFor: null,
    customerNotes: null,
    customerDeclaredJson: null,
    inspectorId: 'inspector-1',
    inspector: { id: 'inspector-1', fullName: 'Ahmed Hassan' },
    reportJson: { items: allItemsScored() },
    overallScore: null,
    reportPdfKey: null,
    inspectedAt: null,
    inspectorSignedAt: null,
    inspectorSignedById: null,
    customerSignatureMethod: null,
    customerSignatureDrawnKey: null,
    customerSignatureTypedName: null,
    customerCivilIdLast4: null,
    customerSignedAt: null,
    customerSignedIp: null,
    customerSignedUserAgent: null,
    customerSignToken: null,
    customerSignTokenExpiresAt: null,
    customerSignTokenLastSentAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── createConciergeInspection (public-shared) ─────────────────────────────

describe('createConciergeInspection', () => {
  it('reconciles existing customer by mobile (no ghost account created)', async () => {
    findCustomerByMobileOrEmail.mockResolvedValueOnce({
      id: 'existing-customer',
      mobile: '98765432',
      email: 'm@example.com',
      fullName: 'Mohammed Al-Sabah',
    });
    nextBookingRef.mockResolvedValueOnce('BMC-CON-000042');
    createInspection.mockResolvedValueOnce(
      row({
        id: 'insp-c1',
        kind: 'concierge',
        status: 'draft',
        bookingRef: 'BMC-CON-000042',
        customerId: 'existing-customer',
        customerPreferredDate: new Date('2026-05-20'),
        customerPreferredWindow: 'morning',
      }),
    );

    const result = await createConciergeInspection(
      {
        kind: 'concierge',
        customer: { fullName: 'Mohammed Al-Sabah', mobile: '+96598765432' },
        vehicle: {
          year: 2020,
          brandName: 'Lexus',
          modelName: 'RX 350',
          mileageKm: 62400,
        },
        location: { address: 'Salmiya, Block 4' },
        customerPreference: { preferredDate: '2026-05-20', window: 'morning' },
      },
      { ip: '127.0.0.1', userAgent: 'test' },
    );

    expect(createGhostCustomer).not.toHaveBeenCalled();
    expect(result.bookingRef).toBe('BMC-CON-000042');
    expect(result.status).toBe('draft');
    expect(result.customerPreference).toEqual({ preferredDate: '2026-05-20', window: 'morning' });
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'inspection.concierge.create' }),
    );
  });

  it('creates a ghost customer when no existing user matches mobile/email', async () => {
    findCustomerByMobileOrEmail.mockResolvedValueOnce(null);
    createGhostCustomer.mockResolvedValueOnce({ id: 'ghost-1' });
    nextBookingRef.mockResolvedValueOnce('BMC-CON-000043');
    createInspection.mockResolvedValueOnce(
      row({ id: 'insp-c2', kind: 'concierge', status: 'draft', bookingRef: 'BMC-CON-000043' }),
    );

    await createConciergeInspection(
      {
        kind: 'concierge',
        customer: { fullName: 'New Person', mobile: '50001111' },
        vehicle: { year: 2019, brandName: 'X', modelName: 'Y', mileageKm: 100 },
        location: { address: 'A' },
      },
      {},
    );

    expect(createGhostCustomer).toHaveBeenCalledWith({
      fullName: 'New Person',
      mobile: '50001111',
      email: null,
    });
  });

  it('strips +965 prefix from mobile before persistence', async () => {
    findCustomerByMobileOrEmail.mockResolvedValueOnce(null);
    createGhostCustomer.mockResolvedValueOnce({ id: 'ghost-2' });
    nextBookingRef.mockResolvedValueOnce('BMC-CON-000044');
    createInspection.mockResolvedValueOnce(row({ kind: 'concierge', bookingRef: 'BMC-CON-000044' }));

    await createConciergeInspection(
      {
        kind: 'concierge',
        customer: { fullName: 'X', mobile: '+96598765432' },
        vehicle: { year: 2020, brandName: 'X', modelName: 'Y', mileageKm: 1 },
        location: { address: 'a' },
      },
      {},
    );

    expect(createGhostCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ mobile: '98765432' }),
    );
  });
});

// ─── saveProgress — state machine transitions ──────────────────────────────

describe('saveProgress', () => {
  it('transitions draft → in_progress on first partial save', async () => {
    findById.mockResolvedValueOnce(row({ status: 'draft', reportJson: { items: [] } }));
    updateInspection.mockResolvedValueOnce(row({ status: 'in_progress', reportJson: { items: [{ itemId: 'exterior.body-hood', status: 'pass', photoKeys: [] }] } }));

    await saveProgress(
      'insp-1',
      { items: [{ itemId: 'exterior.body-hood', status: 'pass', photoKeys: [] }] },
      'actor-1',
      {},
    );

    const patch = updateInspection.mock.calls[0][1] as Record<string, unknown>;
    expect(patch.status).toBe('in_progress');
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'inspection.status.in_progress' }),
    );
  });

  it('transitions in_progress → awaiting_inspector_signoff once all 71 items scored', async () => {
    findById.mockResolvedValueOnce(row({ status: 'in_progress', reportJson: { items: allItemsScored().slice(0, 70) } }));
    updateInspection.mockResolvedValueOnce(row({ status: 'awaiting_inspector_signoff' }));

    await saveProgress('insp-1', { items: allItemsScored() }, 'actor-1', {});

    const patch = updateInspection.mock.calls[0][1] as Record<string, unknown>;
    expect(patch.status).toBe('awaiting_inspector_signoff');
  });

  it('rejects edits to a signed-off inspection', async () => {
    findById.mockResolvedValueOnce(row({ status: 'signed_off' }));
    await expect(
      saveProgress('insp-1', { items: [] }, 'actor-1', {}),
    ).rejects.toMatchObject({ status: 409, code: 'inspection_locked' });
  });

  it('rejects edits while awaiting customer signature', async () => {
    findById.mockResolvedValueOnce(row({ status: 'awaiting_customer_signature' }));
    await expect(
      saveProgress('insp-1', { items: [] }, 'actor-1', {}),
    ).rejects.toMatchObject({ status: 409, code: 'inspection_pending_customer' });
  });
});

// ─── signoff — three branches ──────────────────────────────────────────────

describe('signoff — CPO mode', () => {
  it('finalizes immediately and mirrors inspectorSignedAt to inspectedAt', async () => {
    findById.mockResolvedValueOnce(row({ kind: 'cpo', status: 'awaiting_inspector_signoff' }));
    updateInspection.mockResolvedValueOnce(row({ status: 'signed_off' }));

    const result = await signoff('insp-1', { mode: 'cpo' }, 'actor-1', {});

    const patch = updateInspection.mock.calls[0][1] as Record<string, unknown>;
    expect(patch.status).toBe('signed_off');
    expect(patch.inspectorSignedAt).toBeInstanceOf(Date);
    expect(patch.inspectedAt).toEqual(patch.inspectorSignedAt);
    expect(typeof patch.overallScore).toBe('number');
    expect(result.customerSignUrl).toBeNull();
    expect(result.customerSignTokenExpiresAt).toBeNull();
  });

  it('rejects CPO mode for a Concierge inspection (kind mismatch)', async () => {
    findById.mockResolvedValueOnce(row({ kind: 'concierge', status: 'awaiting_inspector_signoff' }));
    await expect(signoff('insp-1', { mode: 'cpo' }, 'actor-1', {})).rejects.toMatchObject({
      status: 422,
      code: 'kind_mismatch',
    });
  });

  it('rejects sign-off when not all 71 items scored', async () => {
    findById.mockResolvedValueOnce(
      row({ kind: 'cpo', status: 'awaiting_inspector_signoff', reportJson: { items: allItemsScored().slice(0, 50) } }),
    );
    await expect(signoff('insp-1', { mode: 'cpo' }, 'actor-1', {})).rejects.toMatchObject({
      status: 422,
      code: 'incomplete_scoring',
    });
  });

  it('rejects sign-off when state is not awaiting_inspector_signoff', async () => {
    findById.mockResolvedValueOnce(row({ kind: 'cpo', status: 'in_progress' }));
    await expect(signoff('insp-1', { mode: 'cpo' }, 'actor-1', {})).rejects.toMatchObject({
      status: 409,
      code: 'wrong_state_for_signoff',
    });
  });

  it('F2 — auto-advances listing inspection→photoshoot when advanceToPhotoshoot=true', async () => {
    findById.mockResolvedValueOnce(row({ kind: 'cpo', status: 'awaiting_inspector_signoff', listingId: 'listing-1' }));
    updateInspection.mockResolvedValueOnce(row({ status: 'signed_off' }));

    await signoff('insp-1', { mode: 'cpo', advanceToPhotoshoot: true }, 'actor-1', {});

    expect(changeListingStageMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({ stage: 'photoshoot' }),
      'actor-1',
    );
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'listing.stage.auto_advanced' }),
    );
  });

  it('F2 — does NOT advance listing when advanceToPhotoshoot is false/absent', async () => {
    findById.mockResolvedValueOnce(row({ kind: 'cpo', status: 'awaiting_inspector_signoff' }));
    updateInspection.mockResolvedValueOnce(row({ status: 'signed_off' }));

    await signoff('insp-1', { mode: 'cpo' }, 'actor-1', {});

    expect(changeListingStageMock).not.toHaveBeenCalled();
  });
});

describe('signoff — Concierge in-person mode', () => {
  it('finalizes with customer signature attached + audit logged', async () => {
    findById.mockResolvedValueOnce(
      row({
        kind: 'concierge',
        status: 'awaiting_inspector_signoff',
        customer: { id: 'cust-1', fullName: 'M', mobile: '12345678', email: null },
      }),
    );
    updateInspection.mockResolvedValueOnce(row({ status: 'signed_off' }));

    const result = await signoff(
      'insp-1',
      {
        mode: 'concierge_in_person',
        customerSignature: {
          drawnSignatureSvg: '<svg>...drawn signature path data here...</svg>',
          typedName: 'Mohammed Al-Sabah',
          accepted: { owner: true, accurate: true, useForOffer: true },
        },
      },
      'actor-1',
      { ip: '127.0.0.1', userAgent: 'tablet' },
    );

    const patch = updateInspection.mock.calls[0][1] as Record<string, unknown>;
    expect(patch.status).toBe('signed_off');
    expect(patch.customerSignatureMethod).toBe('in_person');
    expect(patch.customerSignatureTypedName).toBe('Mohammed Al-Sabah');
    expect(patch.customerSignedAt).toBeInstanceOf(Date);
    expect(result.customerSignUrl).toBeNull();
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'inspection.concierge.signed_off' }),
    );
  });
});

describe('signoff — Concierge remote-link mode', () => {
  it('issues a 64-char token, dispatches SMS+email, transitions to awaiting_customer_signature', async () => {
    findById.mockResolvedValueOnce(
      row({
        kind: 'concierge',
        status: 'awaiting_inspector_signoff',
        customer: { id: 'cust-1', fullName: 'Mohammed Al-Sabah', mobile: '98765432', email: 'm@example.com' },
      }),
    );
    updateInspection.mockResolvedValueOnce(
      row({
        kind: 'concierge',
        status: 'awaiting_customer_signature',
        customer: { id: 'cust-1', fullName: 'Mohammed Al-Sabah', mobile: '98765432', email: 'm@example.com' },
      }),
    );

    const result = await signoff('insp-1', { mode: 'concierge_remote_link' }, 'actor-1', {});

    const patch = updateInspection.mock.calls[0][1] as Record<string, unknown>;
    expect(patch.status).toBe('awaiting_customer_signature');
    expect(typeof patch.customerSignToken).toBe('string');
    expect((patch.customerSignToken as string).length).toBe(64);
    expect(patch.customerSignTokenExpiresAt).toBeInstanceOf(Date);
    expect(patch.customerSignTokenLastSentAt).toBeInstanceOf(Date);
    expect(sendSignLinkSmsMock).toHaveBeenCalled();
    expect(sendSignLinkEmailMock).toHaveBeenCalled();
    expect(result.customerSignUrl).toContain('/inspection-sign/');
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'inspection.signlink.sent' }),
    );
  });
});

// ─── submitCustomerSignature (public-shared) ───────────────────────────────

describe('submitCustomerSignature', () => {
  it('finalizes the inspection when token is valid + not expired', async () => {
    const future = new Date(Date.now() + 1_000_000);
    findByToken.mockResolvedValueOnce(
      row({
        status: 'awaiting_customer_signature',
        customerSignToken: 'tok123',
        customerSignTokenExpiresAt: future,
        inspectorSignedAt: new Date('2026-05-18T11:00:00Z'),
      }),
    );
    updateInspection.mockResolvedValueOnce(row({ status: 'signed_off' }));

    const result = await submitCustomerSignature(
      'tok123',
      {
        drawnSignatureSvg: '<svg>...drawn signature path data here...</svg>',
        typedName: 'Mohammed',
        accepted: { owner: true, accurate: true, useForOffer: true },
      },
      { ip: '10.0.0.5', userAgent: 'iPhone' },
    );

    const patch = updateInspection.mock.calls[0][1] as Record<string, unknown>;
    expect(patch.status).toBe('signed_off');
    expect(patch.customerSignToken).toBeNull();
    expect(patch.customerSignTokenExpiresAt).toBeNull();
    expect(patch.customerSignedIp).toBe('10.0.0.5');
    expect(result.status).toBe('signed_off');
    expect(typeof result.signedOffAt).toBe('string');
    expect(result.signedOffAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'inspection.customer.signed' }),
    );
  });

  it('returns 410 when token is expired', async () => {
    const past = new Date(Date.now() - 1_000);
    findByToken.mockResolvedValueOnce(
      row({
        status: 'awaiting_customer_signature',
        customerSignToken: 'tok123',
        customerSignTokenExpiresAt: past,
      }),
    );
    await expect(
      submitCustomerSignature(
        'tok123',
        {
          drawnSignatureSvg: '<svg>...drawn signature path data here...</svg>',
          typedName: 'M',
          accepted: { owner: true, accurate: true, useForOffer: true },
        },
        { ip: '1', userAgent: '1' },
      ),
    ).rejects.toMatchObject({ status: 410, code: 'TOKEN_EXPIRED' });
  });

  it('returns 404 for unknown token', async () => {
    findByToken.mockResolvedValueOnce(null);
    await expect(
      submitCustomerSignature(
        'bogus',
        {
          drawnSignatureSvg: '<svg>...drawn signature path data here...</svg>',
          typedName: 'M',
          accepted: { owner: true, accurate: true, useForOffer: true },
        },
        { ip: '1', userAgent: '1' },
      ),
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('returns 409 ALREADY_SIGNED when the inspection is already signed off', async () => {
    findByToken.mockResolvedValueOnce(row({ status: 'signed_off' }));
    await expect(
      submitCustomerSignature(
        'tok',
        {
          drawnSignatureSvg: '<svg>...drawn signature path data here...</svg>',
          typedName: 'M',
          accepted: { owner: true, accurate: true, useForOffer: true },
        },
        { ip: '1', userAgent: '1' },
      ),
    ).rejects.toMatchObject({ status: 409, code: 'ALREADY_SIGNED' });
  });
});

// ─── getInspectionBySignToken ──────────────────────────────────────────────

describe('getInspectionBySignToken', () => {
  it('returns { summary, customerFirstName } for a valid + unexpired token', async () => {
    findByToken.mockResolvedValueOnce(
      row({
        status: 'awaiting_customer_signature',
        customerSignTokenExpiresAt: new Date(Date.now() + 100_000),
        vehicleYear: 2020,
        vehicleBrandName: 'Lexus',
        vehicleModelName: 'RX 350',
        vehicleVin: '1HGBH41JXMN884420',
        vehicleMileageKm: 62400,
        kind: 'concierge',
        customer: {
          id: '22222222-2222-2222-2222-222222222222',
          fullName: 'Mohammed Al-Sabah',
          mobile: '+96550000001',
          email: null,
        },
      }),
    );

    const result = await getInspectionBySignToken('tok');

    expect(result.summary.status).toBe('awaiting_customer_signature');
    expect(result.summary.vehicle.year).toBe(2020);
    expect(result.summary.vehicle.vinMasked).toContain('884420');
    expect(result.customerFirstName).toBe('Mohammed');
  });

  it('throws TOKEN_EXPIRED (410) when token is expired', async () => {
    findByToken.mockResolvedValueOnce(
      row({
        status: 'awaiting_customer_signature',
        customerSignTokenExpiresAt: new Date(Date.now() - 1),
      }),
    );
    await expect(getInspectionBySignToken('tok')).rejects.toMatchObject({
      status: 410,
      code: 'TOKEN_EXPIRED',
    });
  });

  it('throws ALREADY_SIGNED (409) when the inspection is already signed off', async () => {
    findByToken.mockResolvedValueOnce(row({ status: 'signed_off' }));
    await expect(getInspectionBySignToken('tok')).rejects.toMatchObject({
      status: 409,
      code: 'ALREADY_SIGNED',
    });
  });

  it('throws NOT_FOUND (404) when no row matches the token', async () => {
    findByToken.mockResolvedValueOnce(null);
    await expect(getInspectionBySignToken('bogus')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });
});

// ─── resendSignLink rate-limit ─────────────────────────────────────────────

describe('resendSignLink', () => {
  it('rejects with 429 if last send was < 60s ago', async () => {
    findById.mockResolvedValueOnce(
      row({
        status: 'awaiting_customer_signature',
        customerSignToken: 'tok',
        customerSignTokenLastSentAt: new Date(Date.now() - 30_000),
      }),
    );
    await expect(resendSignLink('insp-1', 'actor-1', {})).rejects.toMatchObject({
      status: 429,
      code: 'rate_limited',
    });
  });

  it('dispatches notifications + bumps expiry when last send was > 60s ago', async () => {
    findById.mockResolvedValueOnce(
      row({
        status: 'awaiting_customer_signature',
        customerSignToken: 'tok',
        customerSignTokenLastSentAt: new Date(Date.now() - 120_000),
        customer: { id: 'cust-1', fullName: 'M', mobile: '12345678', email: 'm@example.com' },
      }),
    );
    updateInspection.mockResolvedValueOnce(
      row({
        status: 'awaiting_customer_signature',
        customerSignToken: 'tok',
        customer: { id: 'cust-1', fullName: 'M', mobile: '12345678', email: 'm@example.com' },
      }),
    );

    const result = await resendSignLink('insp-1', 'actor-1', {});

    expect(sendSignLinkSmsMock).toHaveBeenCalled();
    expect(sendSignLinkEmailMock).toHaveBeenCalled();
    expect(typeof result.expiresAt).toBe('string');
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'inspection.signlink.resent' }),
    );
  });
});

// ─── revokeSignLink ────────────────────────────────────────────────────────

describe('revokeSignLink', () => {
  it('clears the token and rolls back to awaiting_inspector_signoff', async () => {
    findById.mockResolvedValueOnce(
      row({ status: 'awaiting_customer_signature', customerSignToken: 'tok' }),
    );
    updateInspection.mockResolvedValueOnce(row({ status: 'awaiting_inspector_signoff' }));

    await revokeSignLink('insp-1', 'actor-1', {});

    const patch = updateInspection.mock.calls[0][1] as Record<string, unknown>;
    expect(patch.status).toBe('awaiting_inspector_signoff');
    expect(patch.customerSignToken).toBeNull();
    expect(patch.customerSignTokenExpiresAt).toBeNull();
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'inspection.signlink.revoked' }),
    );
  });
});

// ─── getInspectionByBookingRef ─────────────────────────────────────────────

describe('getInspectionByBookingRef', () => {
  it('returns ConciergeBookingStatus for a Concierge inspection', async () => {
    findByBookingRef.mockResolvedValueOnce(
      row({
        kind: 'concierge',
        status: 'scheduled' as never,
        bookingRef: 'BMC-CON-000042',
        customerPreferredDate: new Date('2026-05-25'),
        customerPreferredWindow: 'afternoon',
        inspectorId: null,
        inspector: null,
        vehicleYear: 2020,
        vehicleBrandName: 'Lexus',
        vehicleModelName: 'RX 350',
      }),
    );

    const status = await getInspectionByBookingRef('BMC-CON-000042');

    expect(status?.bookingRef).toBe('BMC-CON-000042');
    expect(status?.inspectorAssigned).toBe(false);
    expect(status?.customerPreference).toEqual({
      preferredDate: '2026-05-25',
      window: 'afternoon',
    });
    expect(status?.signLinkAvailable).toBe(false);
  });

  it('returns null when the inspection is CPO (not Concierge)', async () => {
    findByBookingRef.mockResolvedValueOnce(row({ kind: 'cpo' }));
    expect(await getInspectionByBookingRef('BMC-CON-000042')).toBeNull();
  });
});

// ─── hydrateReportPhotoUrls — legacy photoKey backfill ─────────────────────

describe('hydrateReportPhotoUrls', () => {
  it('rewrites raw S3 keys to publicUrl form and passes http(s) entries through', () => {
    const legacyKey = 'inspections/insp-1/exterior.body-hood/abc.jpg';
    const alreadyHydrated = 'https://cdn.example.com/inspections/insp-1/item/x.jpg';
    const httpKey = 'http://other-cdn.test/foo.jpg';

    const hydrated = hydrateReportPhotoUrls({
      items: [
        {
          itemId: 'exterior.body-hood',
          status: 'pass',
          photoKeys: [legacyKey, alreadyHydrated, httpKey],
        },
        // Item with empty photoKeys remains empty
        { itemId: 'exterior.body-roof', status: 'pass', photoKeys: [] },
      ],
    });

    expect(hydrated.items[0].photoKeys).toEqual([
      `http://localhost:9000/cpo-media/${legacyKey}`,
      alreadyHydrated,
      httpKey,
    ]);
    expect(hydrated.items[1].photoKeys).toEqual([]);
  });

  it('is idempotent — running it twice yields the same result', () => {
    const input = {
      items: [
        {
          itemId: 'exterior.body-hood',
          status: 'pass' as const,
          photoKeys: ['inspections/i/x/y.jpg'],
        },
      ],
    };
    const once = hydrateReportPhotoUrls(input);
    const twice = hydrateReportPhotoUrls(once);
    expect(twice.items[0].photoKeys).toEqual([
      'http://localhost:9000/cpo-media/inspections/i/x/y.jpg',
    ]);
  });
});
