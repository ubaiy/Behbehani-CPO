# S3 Storage Conventions

## TL;DR

The codebase uses S3 for media storage with a **relative-key persistence pattern**: Postgres columns store only the relative S3 key (e.g. `listings/abc-123/photos/xyz.jpg`), never absolute URLs. The CDN base URL is prefixed at serialise-time in DTO mappers (via `env.CDN_BASE_URL`), enabling transparent CDN provider swaps and multi-region deployments without schema migrations.

---

## Bucket layout — prefixes per data domain

All paths use **lowercase kebab-case** for prefix segments, **UUIDs** for entity IDs, and **lowercase file extensions**. No spaces, special characters, or version suffixes in keys.

| Prefix | Domain | Sensitivity | Currently used? |
|---|---|---|---|
| `listings/{listingId}/photos/{photoId}.{ext}` | Browse-page car gallery | Public | ✅ v1.0+ |
| `listings/{listingId}/360/{media360Id}.{ext}` | 360-degree spin viewer | Public | ✅ v1.1+ |
| `listings/{listingId}/video/{videoId}.{ext}` | Video walkthroughs | Public | ✅ v1.1+ |
| `listings/{listingId}/thumbnail.jpg` | Generated grid thumbnail | Public | ⚠️ v1.4 planned |
| `inspections/{inspectionId}/photos/{n}.jpg` | Inspection officer field captures | Internal (signed-URL gated) | ✅ v1.1+ |
| `inspections/{inspectionId}/report.pdf` | Generated inspection PDF | Internal | ✅ v1.1+ |
| `inspections/{inspectionId}/signature.png` | Concierge customer signature | Internal | ✅ v1.1+ |
| `users/{userId}/avatar.jpg` | Customer avatar | Public | ✅ v1.3+ |
| `orders/{orderId}/receipt.pdf` | Sale receipt PDF | Internal | ⚠️ v1.4 planned |
| `orders/{orderId}/contract.pdf` | Sale contract PDF (e-signed) | Internal | ⚠️ v1.4 planned |
| `documents/{documentId}/file.{ext}` | Customer document vault entries | Internal | ⚠️ v1.4 planned |
| `documents/{documentId}/thumbnail.jpg` | PDF preview thumbnail | Internal | ⚠️ v1.4 planned |
| `maintenance/{requestId}/photos/{n}.jpg` | Customer-submitted issue photos | Internal | ⚠️ v1.5 planned |
| `civil-ids/{userId}/front.jpg` | Civil ID front scan | **Sensitive PII — encrypted at rest** | ⚠️ v1.3.x / v1.4 planned |
| `civil-ids/{userId}/back.jpg` | Civil ID back scan | **Sensitive PII — encrypted at rest** | ⚠️ v1.3.x / v1.4 planned |
| `passports/{userId}/scan.jpg` | Passport scan (expat customers) | **Sensitive PII — encrypted at rest** | ⚠️ v1.4 planned |
| `driver-licenses/{userId}/scan.jpg` | Driver license scan | Sensitive PII | ⚠️ v1.4 planned |

---

## Path conventions

- **Relative keys only:** persist `listings/abc-123/photos/xyz.jpg`, not `https://cdn.example.com/listings/...`
- **UUIDs for entity IDs:** all keys use Prisma `@db.Uuid` fields for IDs, stored as 36-character hyphenated strings
- **Lowercase extensions:** `.jpg` not `.JPG`; `.pdf` not `.PDF`
- **No special characters:** no spaces, no `:`, no `=`, no `%`; URLs are percent-encoded at the HTTP boundary, not in the key itself
- **No version suffixes:** use S3 versioning + lifecycle policies instead of keys like `photo_v1.jpg`, `photo_v2.jpg`

**Example key structure:**
```
prefix      /  entityId                     /  mediaType  /  itemId     +  extension
listings    /  550e8400-e29b-41d4-a716...  /  photos     /  12345678   +  .jpg
inspections /  a1b2c3d4-e5f6-g7h8-i9j...   /  photos     /  1          +  .jpg
```

---

## Sensitivity tiers + access policies

### Tier 1 — Public

**Examples:** `listings/`, `users/{userId}/avatar.jpg`

- Bucket policy: public read via CDN (no signed URLs)
- Stored URL in DB: **relative key** (e.g. `listings/abc-123/photos/xyz.jpg`)
- Served URL in DTO: CDN base + relative key, prefixed at serialise-time in `toPublic()` / DTO mappers
- Cache: long-lived CDN cache (1 year); invalidate on listing delete
- Signed URLs: N/A (public)
- TTL: N/A

**Example DTO mapping:**
```typescript
// apps/api/src/db/dtos.ts
export function toPhotoDto(row: PhotoRow): PhotoDto {
  return {
    cdnUrl: row.cdnUrl,  // already has CDN base from confirmPhotoUpload
    // OR, if re-computing:
    cdnUrl: row.s3Key ? `${env.CDN_BASE_URL}${row.s3Key}` : null,
  };
}
```

### Tier 2 — Internal (signed-URL gated)

**Examples:** `inspections/`, `orders/`, `documents/`, `maintenance/`

- Bucket policy: private; only signed URLs grant access
- Access: POST endpoint checks resource ownership, returns short-lived signed URL
- Signed URL TTL: **15 minutes** (matches v1.3 access-token TTL)
- Re-signing on refresh: GET endpoint returns a fresh signed URL each call
- Audit: AuditLog entry tracks who accessed which resource and when

**Example signed-URL flow:**
```typescript
// GET /v1/public/documents/:id → return fresh signed URL
const signedUrl = await getSignedUrl(client, new GetObjectCommand({
  Bucket: env.S3_BUCKET,
  Key: doc.fileUrl,  // relative key from DB
}), { expiresIn: 900 }); // 15 minutes
```

### Tier 3 — Sensitive PII (encrypted at rest + short TTL)

**Examples:** `civil-ids/`, `passports/`, `driver-licenses/`

- Bucket policy: private; SSE-KMS or SSE-S3 encryption at rest
- Access: short-lived signed URLs (5-minute TTL)
- Use case: admin reviewing Civil ID during KYC; customer-facing rarely accessed
- Signed URL TTL: **5 minutes** (short window — assume copy-paste between admin staff)
- Access logging: AuditLog MUST record who, when, which document (compliance requirement)
- Retention: 7 years per KW data law (`civil-ids/` and `passports/`); 3 years for driver licenses
- Deletion: purge via scheduled job after retention period; encrypted at rest until deletion
- No thumbnails: never generate thumbnails of PII documents (thumbnail could leak to unintended recipients)

**Access logging example:**
```typescript
// When admin views Civil ID photo
await prisma.auditLog.create({
  data: {
    actorId: admin.id,
    action: 'viewed_civil_id_photo',
    resource: 'user',
    resourceId: customerId,
    // ... captures who, when, why (via custom `reason` field if needed)
  },
});
```

---

## URL persistence pattern

**RULE:** persist **relative keys only** in Postgres. Prefix the CDN base URL at the DTO serialisation boundary.

### Postgres storage

```sql
-- User.avatarUrl column: stores relative key
UPDATE "User" SET "avatarUrl" = 'users/4603a0d5-1234-5678/avatar.jpg' WHERE id = '...';

-- ListingPhoto.s3Key column: stores relative key
INSERT INTO "ListingPhoto" (id, "listingId", "s3Key", ...) 
VALUES ('photo-id', 'listing-id', 'listings/listing-id/photos/photo-id.jpg', ...);

-- Document.fileUrl column: stores relative key (v1.4)
INSERT INTO "Document" (id, "customerId", "fileUrl", ...) 
VALUES ('doc-id', 'customer-id', 'documents/doc-id/file.pdf', ...);
```

### DTO serialisation

```typescript
// apps/api/src/lib/public-user.mapper.ts
export function toPublicUser(user: UserRow): PublicUserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    // avatarUrl stored as relative key; prefix CDN base at serialise-time
    avatarUrl: user.avatarUrl 
      ? `${env.CDN_BASE_URL}${user.avatarUrl}`  // e.g. https://cdn.behbehani-cpo.com/users/.../avatar.jpg
      : null,
  };
}

// apps/api/src/media/media.service.ts
function toPhotoDto(row: PhotoRow): PhotoDto {
  return {
    s3Key: row.s3Key,  // raw key for uploads
    cdnUrl: row.cdnUrl,  // already prefixed at confirmPhotoUpload
    // OR recompute: `${env.CDN_BASE_URL}${row.s3Key}`
  };
}
```

### Why this pattern?

- **CDN provider swap:** change `S3_PUBLIC_BASE_URL` env var, no schema migration
- **Multi-region:** points `S3_PUBLIC_BASE_URL` to regional CDN edge, keeps storage intact
- **Bucket rename:** update env var only; storage keys unchanged
- **Cost optimization:** easily move to different CDN (Cloudflare, Akamai, etc.) without data churn

---

## Lifecycle / retention policies

| Prefix | Lifecycle | Notes |
|---|---|---|
| `listings/` | Permanent (async cleanup on soft-delete) | Deleted when `Listing.deletedAt` is set AND a background job executes (e.g. daily cron). |
| `inspections/` | 7 years per KW vehicle-records norm | Expires after 7 years; schedule S3 lifecycle rule to delete. |
| `users/{userId}/avatar.jpg` | Until user soft-delete, then 30-day grace, then permanent delete | Allows restore-from-soft-delete recovery; hard-delete removes avatar. |
| `orders/` | 10 years per KW commercial-records law | Receipts and contracts; must retain for legal compliance. |
| `documents/` | 10 years per KW commercial-records law | All customer documents; same as orders. |
| `maintenance/` | 5 years post-service-completion | Service invoices; 5-year retention standard. |
| `civil-ids/` / `passports/` | 7 years per KW data law (consult legal) | Encrypted at rest. Hard-delete via scheduled job post-retention. NO early deletion without legal sign-off. |
| `driver-licenses/` | 3 years per KW norm | Shorter than Civil ID; same encryption + job-based hard-delete. |

---

## Bucket setup checklist (operational, NOT engineering)

Per-bucket configuration items the operations team must complete:

- [ ] **Versioning enabled** — allows roll-back and recovery from accidental deletes
- [ ] **Lifecycle rules configured** — automate expiry per the Retention table above (e.g. delete `civil-ids/` after 7 years)
- [ ] **CORS policy set** — allow GET from `https://*.behbehani-motors.com` (storefront) and `https://*.behbehani-cpo.com` (admin), plus mobile app deep-link domain
- [ ] **Server-side encryption configured**:
  - `civil-ids/`, `passports/`, `driver-licenses/`: **SSE-KMS** (customer-managed key)
  - All other prefixes: **SSE-S3** (S3-managed keys, default)
- [ ] **Access logging enabled** — CloudTrail or S3 access logs to CloudWatch (required for PII audit trail)
- [ ] **Public access blocked EXCEPT for Tier 1 prefixes** — use bucket policy to:
  - Allow public GET on `listings/*` and `users/*/avatar.jpg` via CloudFront/CDN only
  - Deny all other public access
  - Deny unauthenticated HEAD/PUT/DELETE on all prefixes
- [ ] **CDN distribution configured** — front `listings/` and `users/` prefixes with CloudFront or equivalent:
  - Cache TTL: 1 year for `listings/photos` and `users/avatar` (immutable content)
  - Origin: S3 bucket (signed request if private, or public + bucket policy)
  - Invalidation: auto-invalidate on listing delete (or manual admin trigger)

---

## When to add a new prefix

When a new subsystem persists files to S3:

1. **Add a row to the Bucket Layout table** above with:
   - Prefix (e.g. `feature/{featureId}/data/`)
   - Domain (e.g. "Feature-specific content")
   - Sensitivity (Tier 1 / 2 / 3)
   - Currently used? (✅ live, ⚠️ planned, or ❌ not started)

2. **Assign a Tier** and document why:
   - Tier 1: public-facing, long-lived cache, no auth
   - Tier 2: internal, short-lived signed URLs, audit log
   - Tier 3: sensitive PII, encryption at rest, very short TTL, compliance audits

3. **Add lifecycle/retention rule** to the Lifecycle table

4. **Update operational checklist** if new bucket permissions or encryption settings are needed

5. **Ensure Postgres column stores RELATIVE KEYS** — implement a comment explaining the pattern:
   ```sql
   ALTER TABLE MyTable ADD COLUMN fileUrl TEXT COMMENT 'S3 relative key; CDN base prefixed at DTO serialise-time';
   ```

6. **Implement DTO mapper** that prefixes CDN base URL (Tier 1) or generates signed URLs (Tier 2/3)

7. **Add S3 key validation** in service — ensure keys start with the expected prefix and contain no illegal characters

---

## Signed-URL conventions (Tier 2 & 3)

When serving Tier 2 or Tier 3 content via signed URLs:

```typescript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';

// Tier 2: 15 minutes
async function getDocumentSignedUrl(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: fileKey,
  });
  return getSignedUrl(s3Client(), command, { expiresIn: 900 }); // 15 min
}

// Tier 3: 5 minutes (sensitive PII)
async function getCivilIdSignedUrl(fileKey: string): Promise<string> {
  // ... same pattern
  return getSignedUrl(s3Client(), command, { expiresIn: 300 }); // 5 min
}
```

---

## Presign vs. confirmed upload flow

### For uploads (e.g. listing photos)

1. **Client requests presigned PUT URL** — `POST /v1/admin/listings/{id}/photos/presign`
2. **Server generates S3 key** with pattern `listings/{listingId}/photos/{photoId}.jpg`
3. **Server creates pending DB row** with `uploadStatus = 'pending'` + `s3Key`
4. **Server returns presigned URL** (valid 15 min for uploads)
5. **Client uploads directly to S3** using presigned URL
6. **Client confirms upload** — `PATCH /v1/admin/listings/{id}/photos/{photoId}/confirm`
7. **Server verifies presence in S3** (optional; skip if cost-prohibitive)
8. **Server updates row** to `uploadStatus = 'complete'` + sets `cdnUrl`

### For downloads (Tier 2/3)

1. **Client requests document** — `GET /v1/public/documents/{id}`
2. **Server verifies ownership** (user owns the document)
3. **Server generates signed URL** with 15-min expiry
4. **Server returns signed URL** in response body or `Location` header
5. **Client follows redirect or uses URL directly** to S3

---

## Key generation patterns by prefix

| Prefix | Key generation | Example | Notes |
|---|---|---|---|
| `listings/{listingId}/photos/` | `listings/{listingId}/photos/{randomUUID}.{ext}` | `listings/abc123/photos/xyz789.jpg` | `ext` from content-type |
| `listings/{listingId}/360/` | `listings/{listingId}/360/{randomUUID}.{ext}` | `listings/abc123/360/xyz789.zip` | |
| `listings/{listingId}/video/` | `listings/{listingId}/video/{randomUUID}.{ext}` | `listings/abc123/video/xyz789.mp4` | |
| `inspections/{inspectionId}/photos/` | `inspections/{inspectionId}/photos/{n}.jpg` | `inspections/abc123/photos/0.jpg`, `.../1.jpg` | Numeric sequence |
| `inspections/{inspectionId}/report.pdf` | Fixed name per inspection | `inspections/abc123/report.pdf` | |
| `users/{userId}/avatar.jpg` | Fixed name per user | `users/user-id/avatar.jpg` | One avatar per user |
| `orders/{orderId}/receipt.pdf` | Fixed name per order | `orders/order-id/receipt.pdf` | |
| `documents/{documentId}/file.{ext}` | `documents/{documentId}/file.{ext}` | `documents/doc-id/file.pdf` | `ext` from MIME type |
| `civil-ids/{userId}/front.jpg` | Fixed name per user | `civil-ids/user-id/front.jpg` | One front per user |
| `civil-ids/{userId}/back.jpg` | Fixed name per user | `civil-ids/user-id/back.jpg` | One back per user |

---

## Maintenance

- **Owner:** Backend session (B) maintains this document
- **Change process:** Sessions A, B, C raise PRs or coordinate via contract blocks if conventions need extension
- **Tier escalation:** promoting a Tier 2 prefix to Tier 3 (e.g. marking a dataset sensitive) requires explicit B + user approval
- **Version control:** this file is checked into the repo at root level so all sessions can reference it
- **Review:** changes to this document should be peer-reviewed to ensure consistency with operational setup

---

**Last updated:** 2026-05-20
**Current version:** v1.0 (supporting v1.0 through v1.3 live + v1.4 planned prefixes)
