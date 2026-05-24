/**
 * Storefront runtime constants.
 *
 * Only values that the customer-facing app reads at runtime live here. The
 * API base URL is configured separately via `provideDataAccess()` in
 * `app.config.ts`.
 *
 * NOTE: When the admin "dealer contact" setting endpoint lands, switch
 * `dealerPhoneE164` to be sourced from the API (e.g. via an `AppConfig`
 * resolver) and delete the literal here.
 */
export const environment = {
  /**
   * Kuwait dealer phone in strict E.164 form — used for the WhatsApp deep
   * link on the VDP lead-capture buttons (`https://wa.me/<number>`). The
   * leading `+` is stripped at link time per wa.me's convention.
   *
   * TODO: replace with real dealer number when the admin setting lands.
   */
  dealerPhoneE164: '+96522000000',
};
