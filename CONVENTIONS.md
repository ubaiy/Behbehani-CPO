# CONVENTIONS.md — coordination tags + sync ritual

> 3 parallel Claude sessions (**A**=storefront, **B**=admin/backend, **C**=mobile)
> work on the same codebase. To avoid drift, every session follows the
> conventions below. Read this once, then refer to STATUS.md for current state.

---

## 1. Standard cross-session tags (use these literal strings — they're grep-able)

### Asks
```
[ASK A→B]  — A asking B for something
[ASK A→C]  — A asking C for something
[ASK B→A]  — B asking A
[ASK B→C]  — B asking C
[ASK C→A]  — C asking A
[ASK C→B]  — C asking B
```

Each ask gets a stable ID after the tag — e.g., `[ASK C→A] A-1: previousPriceFils field`. The ID stays the same until the ask is closed.

### Blockers
```
[BLOCK-A]  — this item is currently blocking session A from progressing
[BLOCK-B]  — blocking B
[BLOCK-C]  — blocking C
```

When something blocks two sessions, tag both: `[BLOCK-A] [BLOCK-C]`.

### Acks
```
[ACK]      — confirmed seen + accepted; no action required
[ACK-RESERVED]  — seen but parking; will action by date X
[ACK-REJECT]    — seen + rejecting; rationale follows
```

### Gates (must verify before crossing)
```
[GATE] smoke walk required
[GATE] security review
[GATE] visual fidelity check
[GATE] migration verified
```

A gate is cleared by the verifier writing `[GATE-CLEARED date verifier]` on the next contract block.

### Shipped markers
```
[SHIPPED 2026-05-20 A v1.4.5]  — date, owner, version
```

---

## 2. Sync ritual — 60 seconds at start of every session

```bash
# 1. What's the current world state?
cat STATUS.md

# 2. Anything blocking me?
grep -rE "\[BLOCK-A\]|\[ASK [BC]→A\]" *.md mockups/*.md 2>/dev/null

# 3. Anything new since I last touched the codebase?
git log --since="2 days ago" --oneline --all
```

(Substitute `A` for your session letter.)

If grep returns hits, address those before starting new work. If STATUS.md hasn't been updated in >24h, that's a stale-coordination smell — flag it.

---

## 3. End-of-session ritual — 5 minutes

```bash
# 1. Update STATUS.md (overwrite, not append)
#    - Update your "In flight" row
#    - Add to "Recently shipped"
#    - Close any items you resolved in "Open asks" or "Blocking"
#    - Bump "Last updated" timestamp

# 2. Post versioned block to the appropriate contract:
#    - A↔B coordination → CONCIERGE_INSPECTION_API_CONTRACT.md
#    - Mobile-only → MOBILE_API_CONTRACT.md
#    - Cross-sprint planning → V1_4_ROADMAP.md (or successor)

# 3. Commit STATUS.md + contract block + code in one commit
#    Commit message format: "v1.4.5 A: account hub rebuild + 5 fixes + Documents wired"
```

---

## 4. File ownership matrix (do NOT touch files you don't own)

| Path | Owner |
|---|---|
| `apps/web/**` | **A** (storefront) |
| `apps/api/**` (except files A explicitly owns below) | **B** |
| `apps/admin/**` | **B** |
| `apps/mobile/**` | **C** |
| `libs/shared/types/src/lib/*.public.schemas.ts` | **A** (designs + ships) — B + C consume |
| `libs/shared/types/src/lib/admin-*.ts` | **B** |
| `prisma/**`, `apps/api/prisma/**` | **B** |
| `mockups/sprint-*-{web|cpo}/` | A or B (per sprint) |
| `mockups/sprint-M*/` | **C** (mobile) |
| `CONCIERGE_INSPECTION_API_CONTRACT.md` | **shared — append-only** |
| `MOBILE_API_CONTRACT.md` | **shared — append-only** |
| `V1_4_ROADMAP.md` | A drafts, all 3 review |
| `STATUS.md` | **shared — overwrite-update each session** |
| `CONVENTIONS.md` (this file) | A maintains; B + C propose changes via contract block |
| `mockups/LOCKED.md` | shared — each mockup approval adds one row |

If you need to touch a file in another session's territory, post `[ASK X→Y] file X` in your next contract block. Don't edit it yourself.

---

## 5. Pre-commit guards (auto-run on every commit)

The repo runs these guards via husky `.husky/pre-commit`:

1. **Brand-lock guard** — fails if customer surface (`apps/web/src/app/features/**`) contains `bg-(amber|yellow|gold|emerald|green|teal|cyan|sky)-` or `text-(amber|yellow|gold|emerald|green|teal|cyan|sky)-`. Customer brand lock is **white + Royal Blue only**. (Red allowed for destructive actions like sign-out-all.)
2. **i18n parity guard** — fails if `en.json` keys ≠ `ar.json` keys (recursive deep-key compare). Symmetric translations required.
3. **Secrets guard** — fails if commit contains patterns matching `.env`, AWS keys, JWT signing keys, or DB connection strings.

To bypass for a documented exception: `git commit --no-verify -m "..."` (only with explicit user permission per CLAUDE.md).

---

## 6. Mockup → code fidelity gate

When a mockup is approved for implementation:
1. Append to `mockups/LOCKED.md`:
   ```
   2026-05-20 | mockups/sprint-5-account/account-v2.html | A | locked | Angular target: apps/web/src/app/features/account/*
   ```
2. Implementation agent must read the LOCKED.md row + the mockup file before touching code.
3. After implementation, run `npm run mockup-diff -- account-v2` (if script exists in package.json) to spot-check structural drift. Manual side-by-side audit if no script.
4. Visual fidelity is a `[GATE]` — must be verified (Chrome MCP screenshot diff) before posting the contract block claiming "shipped".

---

## 7. Visual regression CI (when set up)

Playwright captures baseline snapshots of 10 key customer pages. PRs that drift any pixel beyond threshold without explicit `// VISUAL-OK <reason>` comment fail CI.

See `e2e/web-visual/README.md` for setup once the visualreg-builder agent completes.

---

## 8. Schema additions — pre-emptive stub pattern

If a session anticipates needing a shared-types field 1+ sprints out:
1. Post `[ASK X→A] schema-N: field foo on Bar` ahead of the sprint
2. A adds the field as `foo?: T` (OPTIONAL) immediately — non-breaking
3. The asking session can write code against the type today
4. The implementing session fills in the actual data flow at its own pace

This prevents the catch-up pattern where C had to cast to a local interface for VDP because A hadn't shipped `PublicListingDetailSchema` yet.

---

## 9. Versioning

- Each session's contract blocks are `v{major}.{minor}.{patch} — Session {X}: {title}`.
- Major.minor track the SPRINT (v1.3 = customer account sprint; v1.4 = push+orders+docs sprint).
- Patch increments on every block — doesn't have to be globally monotonic across sessions.
- Use `[SHIPPED date X v1.4.5]` tag in STATUS.md "Recently shipped" so anyone can grep what shipped when.

---

## 10. Severity discipline

When proposing fixes, classify by:

- **P1** — wrong identity / brand-lock violation / breaks core flow / blocks another session → fix this turn
- **P2** — noticeable polish gap / hardcoded copy / sub-optimal UX → fix next sprint
- **P3** — 1px nit / minor copy variant → backlog

If everything is P1, nothing is P1. Be honest.

---

## 11. Three-tier model routing (when spawning ruflo agents)

Per CLAUDE.md:
- **Tier 1** (Agent Booster / WASM) — simple transforms; use direct Edit tool, no LLM
- **Tier 2** (Haiku) — simple tasks: rename, single-file edits, mechanical refactors
- **Tier 3** (Sonnet/Opus) — architecture, security, complex reasoning, mockup fidelity, multi-file rebuilds

Every spawned agent gets:
- A hard tool-call cap
- A single done-condition
- Failure-handoff (NO retry loops)
- Bash timeouts on long builds (~180s default)
- File ownership scope (own only what's listed)

---

## 13. Agent ship-checklist — menu wiring required

> Added 2026-05-20 in response to `[ASK B→A] B-A-1`. Both A and B agents have shipped "feature complete" components that left their nav shell entry as a disabled `<span>` placeholder, making the feature unreachable.

Every new feature surface a session ships must satisfy ALL of these before claiming "done" in a contract block. If any item is missing, the contract block says "feature WIP — menu wire pending" instead of "[SHIPPED]".

### 13.1 Web storefront (A) ship-checklist
- [ ] Component standalone, OnPush, signals
- [ ] Route entry in `apps/web/src/app/app.routes.ts`
- [ ] **Header dropdown / shell nav entry** in `apps/web/src/app/layout/shell.component.ts` — if the feature lives under `/account/*`, it's reachable from the user dropdown OR the account hub tile; if it's a top-level page (e.g. `/browse`), it's in the main nav strip
- [ ] **Account hub tile** in `apps/web/src/app/features/account/account-hub.component.ts` if the feature is under `/account/*`
- [ ] i18n keys EN + AR symmetric (verify `npm run guard:i18n-parity`)
- [ ] Brand-lock clean (verify `npm run guard:brand-lock`)
- [ ] Build verify `npx nx build web --skip-nx-cache`

### 13.2 Admin (B) ship-checklist
- [ ] Component standalone, OnPush
- [ ] Route in `apps/admin/src/app/admin.routes.ts`
- [ ] **Layout shell sidebar nav entry** in `apps/admin/src/app/layout/admin-shell.component.ts` (or equivalent) — the disabled `<span>` placeholder MUST be replaced with the active `<a routerLink>`
- [ ] RBAC role check on the route + on the nav entry
- [ ] Build verify `npx nx build admin --skip-nx-cache`

### 13.3 Mobile (C) ship-checklist
- [ ] Screen in `apps/mobile/app/**` with proper `_layout.tsx` Stack.Screen registration
- [ ] **Account hub tile** in `apps/mobile/app/(tabs)/account.tsx` if user-facing under Account
- [ ] **Deep-link route registered** in `apps/mobile/app.json` if the screen is reachable from server-sent push payload
- [ ] i18n EN + AR if user-facing copy
- [ ] `npx tsc --noEmit -p apps/mobile/tsconfig.json` clean

### 13.4 Verifier
The ship-checklist is verified by the spawning agent (you). If you spawned a sub-agent, the sub-agent's report must explicitly confirm checklist items in its "Done condition" output. Lead agent (in-thread) doesn't have to re-walk — it can trust the sub-agent's report — but the contract block claim of "[SHIPPED]" implies all items passed.

If a checklist item is skipped intentionally (e.g., feature is gated behind a flag and intentionally not yet in nav), the contract block must say so explicitly with the rationale and a `[SHIPPED-PARTIAL]` tag instead of `[SHIPPED]`.

---

## 14. `allowSignalWrites` cycle rule (Angular signals trap)

> Added 2026-05-20 in response to `v1.4.9` addresses-page freeze + `v1.4.13` defense-in-depth audit of 9 other effects.

Before shipping any `effect(() => {...}, { allowSignalWrites: true })`, verify for every signal `X` that the effect **reads** (tracked, i.e. `this.X()` not `untracked(() => this.X())`): the effect does **not** also call `X.set()` or `X.update()` anywhere in the same synchronous execution path. If it does — even conditionally — wrap the read with `untracked()` to break the dependency.

**Cycle pattern (BUG — freezes renderer):**
```ts
effect(() => {
  const items = this.items();           // tracked read
  const current = this.pageState();     // ← ALSO tracked read of a signal we're about to write
  if (current.kind === 'loading') return;
  this.pageState.set(...);              // ← write → re-triggers effect → infinite loop
}, { allowSignalWrites: true });
```

**Fix:**
```ts
effect(() => {
  const items = this.items();
  const current = untracked(() => this.pageState());  // ← untracked read breaks the cycle
  if (current.kind === 'loading') return;
  this.pageState.set(...);
}, { allowSignalWrites: true });
```

**Async-safe (OK):**
```ts
effect(() => {
  const id = this.id();                 // tracked read
  this.api.get(id).subscribe(v => {
    this.cache.set(v);                  // ← write happens INSIDE async callback, outside tracked context
  });
}, { allowSignalWrites: true });
```
Writes inside `.subscribe()`, `setTimeout`, `Promise.then` etc. are outside the tracked context and do NOT cause cycles. Still flag as P3 code smell if convenient.

**v1.4.9 example:** `apps/web/src/app/features/account/addresses.component.ts:354` froze the renderer because `pageState()` was both tracked and written. Fix added `untracked()` wrapper; defense-in-depth in v1.4.13 confirmed all 9 other `allowSignalWrites` effects are SAFE (modal-open writes target different signals; subscribe-callback writes are async-safe).

---

## 13.5 — Effect-cycle pattern (the canonical fix)

> Added 2026-05-24. Promoted from the §14 example into its own rule. Source: v1.4-A23 audit which surveyed every `allowSignalWrites` effect across `apps/web` and codified the fix below.

When an `effect({ allowSignalWrites: true })` reads a signal that it (synchronously, in the same execution) also writes, you have a cycle. The canonical fix is **wrap the read with `untracked()`** so the effect no longer subscribes to its own writes.

```ts
import { effect, untracked } from '@angular/core';

effect(() => {
  const items = this.items();                          // tracked — OK, drives the effect
  const current = untracked(() => this.pageState());   // untracked — breaks the cycle
  if (current.kind === 'loading') return;
  this.pageState.set({ kind: 'ready', items });        // write no longer re-triggers self
}, { allowSignalWrites: true });
```

Rule of thumb: every signal the effect both **reads** and **writes** in the same tick must have its read wrapped in `untracked()`. The audit found 10 such effects in `apps/web` (v1.4.9 + v1.4.13).

---

## 14.1 — `untracked()` trap: it only suppresses READS

> Added 2026-05-24. Multiple agents have tried to "fix" a cycle by wrapping the write in `untracked()`. That doesn't work, and the reason is non-obvious.

`untracked()` suppresses dependency tracking **only for signal reads inside its callback**. Writes inside `untracked()` still notify downstream effects normally — `untracked()` does NOT make a write silent. The cycle-breaker is to wrap the *read*, not the *write*.

```ts
// WRONG — write is still observed by this same effect; cycle persists
effect(() => {
  const v = this.state();
  untracked(() => this.state.set(v + 1));   // ← write fires, effect re-runs, infinite loop
}, { allowSignalWrites: true });

// RIGHT — read is untracked; write no longer re-enters
effect(() => {
  const v = untracked(() => this.state());  // ← effect does not subscribe to state
  this.state.set(v + 1);
}, { allowSignalWrites: true });
```

If you find yourself wrapping a `.set()` / `.update()` in `untracked()`, you're working the wrong end of the cycle — move the wrapper to the corresponding read.

---

## 15. When stuck — escalate, don't guess

If 2+ sessions are deadlocked on the same file ownership question, or if two contract blocks contradict each other:
1. Stop your own work
2. Post `[BLOCK-{me}] tied with {other-session}` in STATUS.md
3. Wait for user signal — don't unilaterally resolve

The user is the tiebreaker. We're advisors, not adjudicators.
