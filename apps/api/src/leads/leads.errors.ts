/**
 * Lead-module domain errors. Caught by the controller's local error
 * adapter and translated to HTTP status codes.
 */
export class LeadError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'LeadError';
  }
}
