# Storage Rules Plan

Updated: 2026-05-26

## Goal

Prepare beta-safe Firebase Storage rules for the A5 closed mall while keeping actual uploads blocked until a separate upload approval and validation pass.

Storage is initialized for `a5-closed-mall`, but this phase does not enable production `uploadBytes` behavior.

## Current Beta Rule

- Default: deny all reads and writes.
- Public storefront media paths can be read.
- Company/nursery private document paths can be read only by scoped operators.
- All writes are currently denied.
- Upload candidates are documented, but actual upload enablement requires separate approval.

## Read Paths

| Path | Read policy |
| --- | --- |
| `public/storefront/**` | public read |
| `companies/{companyId}/products/{productId}/images/**` | public read, plus company/admin scope |
| `companies/{companyId}/products/{productId}/gifs/**` | public read, plus company/admin scope |
| `companies/{companyId}/products/{productId}/videos/**` | public read, plus company/admin scope |
| `companies/{companyId}/ad-materials/**` | public read, plus company/admin scope |
| `companies/{companyId}/onboarding/**` | `SUPER_ADMIN` or matching `COMPANY_ADMIN` only |
| `companies/{companyId}/bank-documents/**` | `SUPER_ADMIN` or matching `COMPANY_ADMIN` only |
| `nurseries/{nurseryId}/business-documents/**` | `SUPER_ADMIN` or matching `NURSERY_ADMIN` only |
| `nurseries/{nurseryId}/rooms/{roomId}/tablet-proofs/**` | `SUPER_ADMIN` or matching `NURSERY_ADMIN` only |
| `settlements/{period}/{companyId}/**` | `SUPER_ADMIN` or matching `COMPANY_ADMIN` only |
| `payouts/{period}/{companyId}/**` | `SUPER_ADMIN` or matching `COMPANY_ADMIN` only |
| `policies/**` | signed-in operators only |
| `audit-exports/**` | `SUPER_ADMIN` only |

## Upload Candidates, Not Yet Enabled

The following upload candidates are intentionally not enabled in `storage.rules` yet:

- `SUPER_ADMIN` CMS uploads for banners, videos, GIFs, popup assets, brand logos, and policy documents.
- `COMPANY_ADMIN` scoped uploads for product images, product GIFs, product videos, business registration, bankbook copy, certification evidence, and ad materials.
- `NURSERY_ADMIN` scoped uploads for nursery business documents and room/tablet proofs.

## Required Before Enabling Uploads

1. File size limits per path.
2. MIME type allowlist per path.
3. File extension normalization.
4. Filename sanitization and server-generated object names.
5. Malware/unsafe content scan policy.
6. Approval workflow for public storefront exposure.
7. Firestore `media_assets` document write flow and audit log.
8. Retention and deletion policy for business documents and bank documents.
9. Owner approval to enable actual `uploadBytes` paths.

## Deploy Command Candidate

Do not run this automatically in this phase. It is recorded for the owner/operator:

```powershell
firebase.cmd deploy --only storage:rules
```

## Still Blocked

- Actual Storage uploads from admin/company/nursery UI.
- Product media upload, business document upload, bank document upload, and video/GIF upload.
- Signed URL policy.
- Malware scan integration.
- Storage rules deployment without owner/operator confirmation.
