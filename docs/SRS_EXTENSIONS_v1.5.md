# SRS Extensions — v1.5 Admin Portal

**Document type:** Extension to SRS baseline (`docs/SRS_Car_Marketplace_Kuwait.txt`)
**Status:** Partial — Extension C in v1.5 scope; Extensions A + B deferred (see §1.1)
**Date:** 2026-05-20 (updated after stakeholder scope-cut decision)
**Owner:** B session (apps/api + apps/admin)
**Scope:** Three admin-portal flows were originally proposed; after stakeholder review, only Extension C (Payment Reconciliation) ships in v1.5. Extensions A (KYC) and B (Documents) are deferred — see §1.1.

---

## 1.1 Scope decision — 2026-05-20

After review, the v1.5 scope is reduced to **Extension C only**. The reasoning:

- **Extension A (KYC Reviewer Queue) — DEFERRED pending PACI integration.** Stakeholder decided to pursue direct Kuwait PACI (Public Authority for Civil Information) lookup to auto-populate KYC fields (full name in EN/AR, DOB, gender, nationality, civil ID expiry, full canonical address) instead of manual admin review. Once the PACI access channel is selected (direct API / 3rd-party vendor / Sahel app), this extension will be re-scoped as an **exception-only fallback queue** for cases PACI cannot resolve (downtime, expats without civil ID, address disputes). Original mockup `apps/admin/.mockups/v1.5-kyc-review.html` retained for v1.6+ reference.
- **Extension B (Global Document Approval Queue) — DROPPED from v1.5.** With KYC docs (Civil ID, passport, driver license) sourced from PACI later and system-generated docs (sale contracts, receipts) not requiring approval, the queue has no meaningful approval workload in v1.5. Deferred to v1.6+ alongside the Loan module (§3.7 bank statements) or Dealer module (§3.9 business licenses) when there is actual content to approve.
- **Extension C (Payment Reconciliation + Refund UI) — IN SCOPE for v1.5.** Fully covered by SRS §3.21 + §6.3. Independent of KYC/PACI decision. Otto Payment Services in mock mode until real credentials land.

---

---

## 1. Why this document exists

The SRS (`docs/SRS_Car_Marketplace_Kuwait.txt`) baseline, approved for development, specifies the complete platform including admin back-office features in §3.15. The baseline assumes third-party integrations (KYC/OCR provider per §4.3, payment gateways per §4.3, notifications per §3.12) are operational and that the admin portal provides domain-specific approval workflows.

However, v1.5 development reveals three operational realities that require **extensions** — new admin flows not explicitly detailed in the SRS:

1. **KYC Reviewer Queue** — No KYC/OCR provider is integrated Day 1; Behbehani's operations team requires a manual review queue to verify customer identity documents.
2. **Global Document Approval Queue** — Document approvals are scattered across per-domain queues (loans, dealer registration, order uploads); a unified cross-domain queue is required to manage backlog and SLA.
3. **Payment Reconciliation + Refund UI** — Double-entry ledger reconciliation and refund issuance require a dedicated finance screen; the SRS specifies the domain (§6.3 Payments & Ledger, §3.21 refund flow) but not the admin UI.

Each extension is **compatible with the SRS** — it does not contradict existing requirements, but **deepens the operational detail** beyond what the baseline specifies. This document records the extensions so audit, compliance, and future sprints have a paper trail and can reference these decisions.

---

## 2. Extension A — KYC Reviewer Queue (admin) — DEFERRED

> **STATUS: DEFERRED to v1.6+ pending PACI integration decision.** See §1.1. Mockup retained for future reference. Sections 2.1–2.5 below describe the originally-proposed scope and are preserved for historical context.

### 2.1 What the SRS says today

The SRS §1.3 (line 201–202) defines KYC as "Know Your Customer — identity verification of users." Section §4.3 (lines 1101–1103) lists "KYC / OCR Provider" as a third-party software interface for "Civil ID OCR and identity verification" with "Outbound" direction, implying automated processing.

Section §3.7 Financing (lines 605–607) requires loan applications to capture "copy of Civil ID, copy of passport (expats)" and states "The System shall encrypt uploaded documents at rest and limit access to authorized finance officers" — this implies documents are stored but does not specify a human-review workflow if automated OCR fails.

The baseline presumes KYC and OCR are operational; it does not describe a fallback approval queue.

### 2.2 What v1.5 adds

New admin route `/operations/kyc`:

- **Queue view:** Paginated list of pending KYC submissions, filtered by status (pending / approved / rejected / re-request-issued), customer name, submission date, Civil ID type.
- **Detail drawer:** Customer profile, uploaded Civil ID images (front/back), OCR confidence score (if available), previous rejection reasons (if re-submission).
- **Actions:** Admin can Approve (mark verified), Reject with reason (free-text), or Re-request (ask customer to re-upload clearer images).
- **Audit trail:** All KYC decisions logged with admin user, timestamp, and reason.

### 2.3 Why

Day-1 operational reality: No KYC/OCR vendor is procured or integrated. Until that vendor (e.g., a Kuwait-licensed identity-verification provider) is onboarded, customer Civil ID submissions via the purchase flow (§3.17 Step 4, line 839) have no path to verification. Without a verified KYC status, orders and financing cannot safely proceed. This queue serves as the human-review fallback. **Once a KYC/OCR provider is integrated in a later sprint, this queue transitions to an "edge-case / manual override" surface** for submissions the OCR vendor cannot auto-decide (low confidence, damaged ID, etc.).

### 2.4 Schema impact

- **User model:** Add `kycStatus` enum: `pending` | `approved` | `rejected` | `expired`. Add `kycVerifiedAt` timestamp (nullable).
- **KycSubmission table:** Track individual KYC submissions (not overwrite) to preserve audit trail: `id`, `user_id` FK, `civil_id_image_front_url`, `civil_id_image_back_url`, `ocr_score` (nullable), `status`, `reviewed_by_admin_id` FK, `rejection_reason`, `reviewed_at`, `created_at`.
- **Migration:** Non-breaking; KYC features are gated to `/operations/kyc` (admin-only route, not customer-facing in v1.5).

### 2.5 Risk if not built

Customer Civil ID data submitted via purchase flow (§3.17 Step 4, line 839) has no path to verified status. Financing institutions (§3.7 banks, line 604) will reject loan applications with unverified customer identity. Revenue-critical purchase flow is blocked.

---

## 3. Extension B — Global Document Approval Queue (admin) — DROPPED FROM v1.5

> **STATUS: DROPPED FROM v1.5; deferred to v1.6+ alongside Loan / Dealer modules.** See §1.1. With KYC docs PACI-sourced later and system-generated PDFs (sale contracts, receipts) not requiring approval, no meaningful workload exists in v1.5. Sections 3.1–3.5 below describe the originally-proposed scope and are preserved for historical context.

### 3.1 What the SRS says today

Document approval workflows are specified across multiple domains:

- **§3.7 Financing (line 607):** Documents encrypted at rest, access limited to authorized finance officers. §6.3 (line 1420) lists Financing module with "document vault" and "status" — implies document tracking but not a unified queue.
- **§3.9 Dealer (lines 670–671):** "Dealer registrations shall be reviewed and approved by an admin before activation" — per-dealer approval workflow.
- **§3.17 Purchase (line 839):** "Documents shall be validated and stored encrypted in the document vault" — Step 4 of checkout uploads customer docs, implies validation but does not specify admin approval UI.
- **§3.12 Notifications (line 725):** System sends "listing approved/rejected" notifications, establishing the pattern that approvals/rejections are admin actions that trigger user notification.

Each domain has its own approval surface within its module, but the SRS does not specify a **unified cross-domain queue** to surface all pending documents and SLA risk across the entire system.

### 3.2 What v1.5 adds

New admin route `/operations/documents`:

- **Unified queue:** All `Document` rows across all sources (loan apps, order uploads, dealer registration docs, inspection reports) displayed in a single paginated table.
- **Filters:** Document type (civil_id, passport, salary_cert, bank_stmt, dealer_license, etc.), status (pending / approved / rejected), customer/owner name, submission date, source module (financing / orders / dealer / inspection).
- **Bulk actions:** Select multiple documents, approve or reject in bulk (with single reason applied to all selected).
- **Detail drawer:** Document preview (image or PDF), owner details, source context (which customer/loan/order), previous approval history if re-submission.
- **Per-customer drill-down:** Link to `customers/:id/documents` for customer-specific document history and per-customer document vault (preserves domain-specific views).

### 3.3 Why

Operations team currently enters each customer/dealer/loan individually to review pending documents. This is inefficient and masks backlog. A unified queue surfaces total volume of pending approvals, allows SLA tracking (approval time per document type), and enables bulk processing. The per-customer drill-down is retained so domain experts can still review documents in context.

### 3.4 Schema impact

- **Document model (existing):** Add new columns: `status` enum (DocumentStatus: `pending` | `approved` | `rejected`), `reviewed_by_admin_id` FK (nullable), `reviewed_at` timestamp (nullable), `rejection_reason` (text, nullable). Add compound index on `(status, created_at)` for queue performance.
- **DocumentStatus enum:** New domain type defining approval states.
- **Migration:** Backfill existing documents with `status: 'approved'` (assume all current docs are approved since approval was implicit before this feature).

### 3.5 Risk if not built

No SLA visibility on pending documents. Backlog spread across multiple per-domain queues (Finance officers check `/finance/documents`, Dealers check their own `/dealer/:id/documents`, Customer-support enters `/customers/:id` to see order docs). Uneven approval times, potential regulatory audit findings if approval timelines cannot be tracked.

---

## 4. Extension C — Payment Reconciliation + Refund UI (admin)

### 4.1 What the SRS says today

Payment domain is well-specified across multiple sections:

- **§6.3 Payments & Ledger (line 1434):** "KNET, Visa/Mastercard, bank transfer, deposits, refunds, payouts, double-entry ledger" — mandates double-entry ledger architecture (every payment must have matching debit and credit entries).
- **§4.3 Payment Gateways (lines 1041–1049):** KNET, Visa/Mastercard, and Bank Transfer are required integrations. Deposit collection (§3.17 line 825) and full payment (implied) flow through these gateways.
- **§4.4 Webhooks (line 1113):** "Webhooks shall be supported for partner bank decisioning and payment confirmation callbacks" — enables asynchronous payment status updates.
- **§3.21 Returns + Refunds (lines 924–939):** Refund flow is fully specified: initiated → picked_up → inspected → approved → sent → closed. Line 935 specifies status enum; line 934 states "System shall trigger a refund through the same payment instrument."
- **§6.4 Data Model (line 1534):** Refund entity defined with `id`, `order_id`, `original_payment_id`, `amount_kwd`, `deductions[]`, `status`, `processed_at`.

The baseline specifies the **data model and flow** but does not detail an **admin UI** for Finance Officers to investigate unmatched payments or manually issue refunds. The SRS assumes the backend processes refunds automatically; in practice, operational oversight is required.

### 4.2 What v1.5 adds

New admin route `/finance/payments`:

- **Summary tiles:** Total payments today, reconciled, unmatched, pending refunds (counts and KWD totals).
- **Reconciliation banner:** Last reconciliation check timestamp (when webhook reconciliation ran), count of payments requiring investigation (DB payment ≠ gateway webhook state).
- **Payments table:** All payments with columns: order ID, customer name, amount KWD, payment method, gateway status, DB status, timestamp, actions (view detail, reconcile, reverse).
- **Detail drawer:** Payment full details, linked order, timeline of webhook events (Otto Payment Services webhook log), matching logic (which DB payment matched to which gateway transaction), deduction breakdown (if return).
- **Mock refund modal (v1.5 only):** UI to issue refund, with fields for reason and amount; marked as "MOCK MODE — requires real Otto credentials Day 5." In production, refund will be sent to Otto API; in v1.5, logged as mock action.

### 4.3 Why

§6.3 mandates double-entry ledger and reconciliation; that requires a UI for Finance Officers to reconcile DB payment records against gateway webhooks. §3.21 refund flow requires admin issuance — customers cannot self-serve refunds. This screen provides visibility into payment state and a control point for refund authorization.

### 4.4 Provider choice — Otto vs SRS-named KNET

**Important architectural note:** The SRS (§4.3, line 1041) names KNET as the primary Kuwait payment network for deposits and payments. However, **v1.4 selected Otto Payment Services as the payment aggregator / orchestrator**, which is expected to proxy KNET, Visa, Mastercard, and other methods. Otto is a third-party payment service, not KNET itself. This is a **project-level architectural decision outside the SRS scope**, but it affects the v1.5 UI:

- The reconciliation screen will display "Otto Payment Services" as the gateway name and reconcile against Otto webhook events (not direct KNET).
- Real Otto credentials land on Day 5; until then, the refund modal is gated as **mock-only** (button is disabled with tooltip "Awaiting Otto API credentials").
- The decision to use Otto does not contradict the SRS (KNET is still supported through Otto); it is an **implementation choice** that future audits should understand.

### 4.5 Schema impact

**Partial-refund modeling decision (pending finalization):**

Two options for refund amount tracking:

**Option A (column-based):**
- Add `refundedAmountFils` column to Payment model.
- When a refund is issued, update the Payment row's `refundedAmountFils` and set `status: 'refunded'`.
- Simpler query for "how much was refunded on this payment?" but breaks double-entry ledger principle (single row with two concepts: original charge and refund).

**Option B (ledger-style, recommended):**
- Create a new **negative-amount Payment row** for each refund (e.g., original payment: +KWD 500, refund: -KWD 100).
- Both rows are separate entries in the `payments` table; linked via `original_payment_id` FK on the refund row.
- Preserves double-entry ledger: every debit (positive) has a matching credit (negative).
- Aligns with §6.3 requirement.

**Recommendation:** Proceed with **Option B** for compliance with §6.3 double-entry ledger mandate.

### 4.6 Risk if not built

Finance Officers cannot reconcile DB vs. Otto webhook state. Manual reconciliation requires Otto dashboard login (out-of-band). Refunds require manual Otto dashboard intervention — no in-app workflow. Double-entry ledger requirement (§6.3) cannot be satisfied without ledger-structured refund rows. Audit trail for refund decisions is incomplete.

---

## 5. Cross-cutting concerns

- **Audit trail (§3.21, line 939):** All three extensions generate audit log entries (KYC decision, document approval, payment reconciliation action). Reuse existing `AuditLog` table with `action`, `admin_user_id`, `entity_type`, `entity_id`, `reason`, `timestamp`. Already in scope per SRS.

- **Notifications (§3.12, lines 725–731):** When KYC is approved/rejected, customer is notified via push + email. When documents are approved/rejected, relevant owner (customer, dealer, finance applicant) is notified. When refund is issued, customer is notified of refund status change. Reuse existing FCM + email infra; add template keys to CMS: `kyc_approved`, `kyc_rejected`, `document_approved`, `document_rejected`, `refund_issued`.

- **Admin roles & RBAC (§3.15, §2.3):** Three new roles may need adding to `ADMIN_ROLES` enum: (a) `KyC_REVIEWER` (can view/approve/reject `/operations/kyc`), (b) `COMPLIANCE_OFFICER` (can view/approve/reject `/operations/documents`), (c) `FINANCE_OFFICER` (can view/reconcile `/finance/payments` and issue refunds). Existing `FR-ADM-002` RBAC framework (not detailed in SRS but assumed) will gate route access. Proposal: add roles to admin seed data in v1.5; assign to test users; escalate to stakeholder if role names conflict with organizational structure.

- **Data retention (§7 Compliance, implied):** KYC submissions, approval decisions, and refund audit logs must be retained per applicable Kuwaiti data-protection and financial-services regulations. SRS does not specify retention periods. **Assumption:** Align with loan-application retention (§3.7 line 621 "Applications and decisions shall be retained for the period required by applicable financial-services regulation"). **Action:** Confirm retention period with Legal/Compliance; implement soft-delete or archival for documents older than the retention cutoff.

- **Mock mode for Otto (v1.5 only):** Until real Otto credentials arrive, refund operations are logged as mock actions (`refund.is_mock = true`). The UI displays a banner "MOCK MODE — refunds not sent to Otto" and the refund modal button is disabled. Once credentials land, update `.env` with Otto API key and toggle `REFUND_MOCK_MODE = false` to enable real refund submission. This is a **temporary extension** for v1.5 only; full production refund will be enabled in v1.6 or later.

---

## 6. Approval ledger

| # | Extension | SRS sections cited | Status | Approver | Date | Notes |
|---|-----------|-------------------|--------|----------|------|-------|
| A | KYC Reviewer Queue | §1.3, §4.3 (L201–202, L1101–1103) | **DEFERRED to v1.6+** | Stakeholder | 2026-05-20 | Pursuing PACI direct integration instead; queue reframes as exception-only fallback once PACI channel selected |
| B | Global Document Queue | §3.7, §3.9, §3.17, §3.12 (L607, L670–671, L839, L725) | **DROPPED FROM v1.5** | Stakeholder | 2026-05-20 | No approval workload until Loan / Dealer modules ship; revisit in v1.6+ |
| C | Payment Recon + Refund | §6.3, §4.3, §4.4, §3.21, §6.4 (L1434, L1041–1049, L1113, L924–939, L1534) | **IN SCOPE v1.5** | _pending technical sign-off_ | _pending_ | Otto aggregator (not KNET direct); mock mode until Day 5 creds; refund ledger decision pending (recommend Option B) |

---

## 7. Related documents

- **Baseline SRS:** `docs/SRS_Car_Marketplace_Kuwait.txt`
- **Admin self-audit (v1.5):** `docs/admin-self-audit-v1.5.md` _(if exists)_
- **KYC mockup:** `apps/admin/.mockups/v1.5-kyc-review.html`
- **Documents mockup:** `apps/admin/.mockups/v1.5-documents-approval-queue.html`
- **Payments mockup:** `apps/admin/.mockups/v1.5-payment-reconciliation.html`
- **Design baseline:** `apps/admin/.mockups/DESIGN-BASELINE.md`
- **Project memory (Behbehani CPO decision ledger):** `~/.claude/projects/.../memory/MEMORY.md`

---

## 8. Implementation checklist for v1.5

**Only Extension C tasks below are active. A and B tasks parked.**

- [ ] **Payment Extension:** Payment reconciliation endpoint (reconcile against Otto webhook state), `/finance/payments` route, refund modal (mock-mode gated), Refund ledger decision (Option A vs. Option B — recommend B), Otto webhook consumer.
- [ ] **Cross-cutting (Payment only):** `FINANCE_OFFICER` admin role, route RBAC guard for `/finance/*`, notification template for refund-issued, audit log entries, mock-mode feature flag for refunds.
- [ ] **Testing:** Unit tests for payment reconciliation matching + refund ledger row creation; integration test for Otto webhook consumer with mock fixtures; E2E test for admin refund-issuance workflow.
- [ ] **Staging validation:** Verify payment reconciliation banner accuracy against mock Otto webhooks; verify mock-refund modal records audit log entry without calling Otto.

**Deferred (revisit v1.6+):**
- ~~KYC Extension~~ — parked pending PACI integration channel selection
- ~~Document Extension~~ — dropped; revisit alongside Loan/Dealer modules
- ~~KYC_REVIEWER + COMPLIANCE_OFFICER roles~~ — defer with the extensions they gate

---

## 9. Sign-off

**Document prepared by:** B session team  
**Date prepared:** 2026-05-20  
**Awaiting approval from:** Product Owner, Compliance Officer, Finance Lead  
**Approval signatures:** _(to be filled after stakeholder review)_
