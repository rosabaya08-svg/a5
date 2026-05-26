# Storage Rules Plan

Updated: 2026-05-26

## Goal

Prepare beta-safe Firebase Storage rules for the A5 closed mall while enabling storefront CMS media registration/editing for the live beta.

Storage is initialized for `a5-closed-mall`. CMS upload is enabled only for closed-mall visual assets; private business documents, payout files, settlement files, and audit exports remain blocked.

## Current Beta Rule

- Default: deny all reads and writes.
- Public storefront media paths can be read.
- Company/nursery private document paths can be read only by scoped operators.
- CMS asset writes are enabled for image/video files under the approved storefront/ad/product media paths.
- Uploads are limited by MIME type and a 25 MB beta size limit.

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

## Enabled Beta Upload Paths

The following upload paths are enabled for the A5 closed-mall CMS beta:

- `public/storefront/**` for homepage sections, brand logos, and storefront media assets.
- `companies/{companyId}/ad-materials/**` for banner, video, GIF, and campaign media.
- `companies/{companyId}/products/{productId}/images/**` for product/detail images.
- `companies/{companyId}/products/{productId}/gifs/**` for GIF assets.
- `companies/{companyId}/products/{productId}/videos/**` for product/detail video assets.

These paths are still beta-limited and do not enable private document uploads or payout/settlement files.

## Required Before Enabling Uploads

1. File size limits per path.
2. MIME type allowlist per path.
3. File extension normalization.
4. Filename sanitization and server-generated object names.
5. Malware/unsafe content scan policy.
6. Approval workflow for public storefront exposure.
7. Firestore `media_assets` document write flow and audit log.
8. Retention and deletion policy for business documents and bank documents.
9. Production approval before expanding uploads beyond storefront/CMS beta paths.

## Deploy Command Candidate

Executed for the live beta on 2026-05-26:

```powershell
firebase.cmd deploy --only firestore:rules,storage
```

## Still Blocked

- Private business document upload, bank document upload, settlement/payout files, and audit export uploads.
- Signed URL policy.
- Malware scan integration.
- Production upload governance beyond storefront/CMS beta.
