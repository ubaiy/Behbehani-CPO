/**
 * Test Drive Booking module domain errors. Caught by the controller's local
 * error adapter and translated to HTTP status codes.
 */
export class TestDriveError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'TestDriveError';
  }
}
