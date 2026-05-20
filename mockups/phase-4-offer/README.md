# Phase 4 — Buy-Offer Module & CPO Hardening: Mockup Index

All files are standalone HTML. Open any file directly in a browser via `file://` — no server needed.
Each embeds Tailwind via CDN and the appropriate Google Font (Inter for admin, Plus Jakarta Sans for customer).

---

## Admin mockups (white + blue palette, Inter)

### `admin-offer-create.html`
Admin lands here from a signed-off Concierge inspection detail page. Contains:
- Vehicle summary card with score circle (92/100) using the exact same segmented pattern as the signoff page
- Section score bars with red/amber/brand colouring matching the inspection rubric
- Items-needing-attention collapsible (FAIL + ADVISORY chips match `inspection-labels.ts` ON classes)
- Large KWD amount input (KD prefix, 2xl font — makes the financial gravity obvious)
- Validity date picker defaulted to +7 days
- Internal notes textarea (explicitly labelled "not visible to customer")
- Customer strip with amber "No offer yet" pill (amber = pending/awaiting per palette rule)
- Right-column market estimate panel (clearly labelled Beta / stubbed)
- Sticky bottom bar: Cancel / Save draft / Send offer (Save Draft never publishes — per admin design decision memory)

### `admin-offers-queue.html`
List view of all offers with filter pills and KPI strip. Contains:
- KPI strip: Pending response (amber), Counters open (brand-blue), Accepted this week (slate), Expired this week (red)
- Status filter pills with active/inactive states
- Table rows: each has booking ref, customer name, vehicle one-liner, KWD amount, status pill, validity, action button
- Status pill colour mapping (per palette rules):
  - Drafted → slate neutral
  - Sent → amber (pending/awaiting state)
  - Countered → brand-blue + "Action needed" badge
  - Accepted → slate (resolved)
  - Expired → red
  - Declined → red
- One skeleton loading row to demonstrate loading state
- Empty state treatment (commented out inline — uncomment to preview)
- Pagination strip

### `admin-offer-detail.html`
Single offer view with counter-received state active. Contains:
- Hero state card with current offer amount, status pill, and customer counter callout (brand-blue bg)
- Four action buttons: Accept counter (primary brand-blue), Re-issue at different price, Decline counter (red-outlined), Withdraw (ghost)
- Vertical timeline using brand-blue dots + CSS connector lines — traces all 5 rounds of negotiation (Offer #1 → Customer counter → Admin declined → Offer #2 → Current counter)
- Linked inspection collapsible with mini score circle and section counts
- Right sidebar: customer card with phone, email, copy-link button
- Offer metadata card (round number, created by, expires)

---

## Customer mockups (Royal Blue #1E3A8A, Plus Jakarta Sans, generous whitespace)

### `customer-offer-view.html`
Customer lands here from SMS/email token link. Contains:
- Royal Blue gradient hero with "Hi Mohammed" greeting, KD 8,500 offer in large type (5xl/6xl), and amber countdown chip
- Vehicle summary card with icon placeholder
- Collapsible inspection report (score circle + section bars + items-needing-attention in customer-friendly language)
- Three action buttons: Accept (primary, 56px height), Counter/suggest price (outlined), Decline (text-only)
- Fine print: T&Cs, payment info, support contact

### `customer-offer-accepted.html`
Confirmation page after acceptance. Contains:
- Animated pop-in checkmark (CSS keyframes, no JS libs)
- "Thank you, Mohammed!" headline + offer summary sentence
- Contact info with +965 5555 1234 within 24 hours
- "What happens next" 3-step numbered checklist (Sales contact → Vehicle pickup → Payment)
- Transaction reference in monospace pill
- Support contact

### `customer-offer-declined.html`
Quiet confirmation after decline — no celebratory tones. Contains:
- Neutral hand-wave SVG icon (slate palette)
- Measured headline: "Understood — we appreciate the time you've given us."
- Optional feedback form: radio reasons + open textarea (max 300 chars, live count via JS)
- "Browse CPO cars to buy" gentle redirect CTA
- Support contact

### `customer-offer-counter.html`
Customer submits a counter price. Contains:
- One-round warning chip (amber — informational)
- KWD amount input with live thousand-separator formatting (small JS)
- Optional reasoning textarea (500 char limit, live count)
- Response time notice: BMC responds within 24 hours
- Submit + Cancel buttons (56px / 44px heights)

### `customer-offer-expired.html`
Fallback when offer token is hit after validity window. Contains:
- SVG empty-state illustration (inline, clock face with X overlay)
- "This offer has expired" headline + expiry date
- Primary CTA: Book new Concierge inspection
- Secondary CTA: Browse CPO cars
- Brief explanation of what a Concierge inspection involves
- Support contact

---

## CPO hardening mockups

### `admin-cpo-signoff-confirm.html`
Confirmation modal for CPO sign-off. Contains:
- Modal overlay (dimmed backdrop, centered dialog, max-w-md)
- Plain-English explanation of what sign-off does (locks report, generates PDF, advances stage)
- Pre-checked "Move to photoshoot stage" checkbox with explanation of what auto-advance does
- Inspector name + score confirmation strip
- Cancel + Confirm sign-off buttons (both ≥ 44px)

### `customer-cpo-inspection-report.html`
Customer-facing CPO inspection report (opens from listing detail page). Contains:
- Royal Blue gradient hero with vehicle image placeholder, price, listing ref, Behbehani Certified badge
- Large score circle (94/100) with section score grid
- PASS/ADVISORY/FAIL summary counts using customer-appropriate colour language (slate for advisory, not amber — per `inspection-labels.ts` comment that amber is admin-only)
- Collapsible 71-point breakdown with section groupings, item rows with status chips
- Download PDF button + inspector credit line
- Back to listing link

---

## Open design questions for stakeholder review

1. **Counter-offer as page or inline expansion?**
   Currently mocked as a separate page (`customer-offer-counter.html`). An inline expansion below the action buttons would reduce navigation steps but complicates state management. Recommend separate page for the first implementation.

2. **Accepted chip colour on admin queue.**
   Per the white+blue-only admin palette rule, "Accepted" uses slate-100/slate-700 (a resolved/neutral state). If stakeholders feel this should be visually distinct (positive outcome), one option is brand-100/brand-700 — but that would be the same as "Countered". Needs decision before Angular implementation.

3. **Market estimate panel — data source.**
   `admin-offer-create.html` shows the price suggestion panel with a "Beta" badge and static data. Needs a decision on whether to wire to an internal pricing model or a third-party valuation API before Sprint 4 ends.

4. **One counter-offer round — is this a hard business rule?**
   The warning chip in `customer-offer-counter.html` says "this is your only counter-offer round." If the business allows multiple rounds (as shown in the admin detail history with 5 rounds), this copy needs updating or the rule needs to be confirmed.

5. **CPO signoff modal placement.**
   `admin-cpo-signoff-confirm.html` is mocked as a free-floating modal. In the Angular implementation, it should trigger from the existing `inspection-signoff.component.ts` finalize step — specifically replacing or augmenting the confirm text input pattern.

6. **Customer report: item status chip colours.**
   Admin uses amber for ADVISORY. Customer-facing report uses slate-200/slate-700 for advisory (per the comment in `inspection-labels.ts`). Verify this is the final decision — some stakeholders may prefer the same amber for visual consistency between the inspection report PDF and the web view.
