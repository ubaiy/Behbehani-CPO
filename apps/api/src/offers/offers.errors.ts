/**
 * Offer-module domain errors. Caught by the controller's local error adapter
 * and translated to HTTP status codes + structured { error, code } JSON.
 * Mirrors InspectionError from inspections.errors.ts.
 */
export class OfferError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'OfferError';
  }
}
