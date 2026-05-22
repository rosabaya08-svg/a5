# Worktree Scope Matrix

## Purpose

This matrix defines allowed and prohibited paths for each parallel worktree. It is used during merge review to prevent accidental cross-track edits and shared report conflicts.

| Track | Allowed Paths | Prohibited Paths |
| --- | --- | --- |
| `firebase-contract` | Firebase contract docs, adapter planning docs, `reports/firebase-contract/**` | UI routes, `.env`, Firebase config/rules files, real SDK connection |
| `qa` | `.github/workflows/**`, QA root docs, `reports/qa/**` | Feature UI/data files, common root reports, production config/secrets |
| `admin` | `app/admin/**`, `components/admin/**`, `components/pages/adminPages.tsx`, `data/admin/**`, `types/admin.ts`, `reports/admin/**` | Company/nursery/tablet/QR/guest routes, common root reports |
| `company` | `app/company/**`, `components/company/**`, `components/pages/companyPages.tsx`, `data/company/**`, `types/company.ts`, `reports/company/**` | Admin/nursery/tablet/QR/guest routes, common root reports |
| `nursery` | `app/nursery/**`, `components/nursery/**`, `components/pages/nurseryPages.tsx`, `data/nursery/**`, `types/nursery.ts`, `reports/nursery/**` | Admin/company/tablet/QR/guest routes, common root reports |
| `tablet-qr` | `app/tablet/**`, `app/q/**`, `app/orders/guest/**`, `components/tablet/**`, `components/guest/**`, `components/pages/tabletPages.tsx`, `components/pages/guestPages.tsx`, mock product/order/QR data, mock repositories, `reports/tablet-qr/**` | Firebase repositories, Firebase SDK imports, common root reports |

## Shared File Caution

| Shared Area | Risk | Review Rule |
| --- | --- | --- |
| `components/pages/*Pages.tsx` | Route-level conflicts | Owning track wins; run route smoke after merge. |
| `data/mock*` | Fixture ID drift | Preserve smoke IDs or update all QA docs together. |
| `components/ui/**` | Cross-track visual regressions | Prefer additive changes and verify affected routes. |
| `types/**` | Build/type conflicts | Prefer optional additive fields and run build after merge. |
| Root reports | Merge conflicts and stale status | Use `reports/<track>/` and integrate with `REPORT_MERGE_GUIDE.md`. |

## Review Questions

- [ ] Did the track modify only its allowed paths?
- [ ] Did the track avoid common root `AUTO_REPORT.md`, `NEXT_TASKS.md`, and `BLOCKERS.md`?
- [ ] Did the track create only report files under its own `reports/<track>/` folder?
- [ ] Did the track avoid live integration files and secrets?

