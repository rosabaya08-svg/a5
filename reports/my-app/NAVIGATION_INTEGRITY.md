# Navigation Integrity Report

Date: 2026-05-25

## Scope

Left sidebar UI/UX must stay fixed across admin, company, nursery, and content management screens. The sidebar should not change its menu footprint when moving between dashboard, CMS, product, order, payment, or operation routes.

## Changes

- Created a single navigation source in `components/layout/navigation.ts`.
- Admin pages and admin CMS pages now share `adminNavItems`.
- Company pages and company content/advertising pages now share `companyNavItems`.
- Nursery pages now use `nurseryNavItems`.
- `AppShell` normalizes sidebar titles by role:
  - admin: `최고관리자`
  - company: `기업 Admin`
  - nursery: `산후조리원 Admin`
- `AdminSidebar` now uses `usePathname()` for active-route highlighting.
- Sidebar width, height, scroll behavior, footer position, and menu item height are fixed for desktop layouts.

## Route Link Check

All central sidebar links currently resolve to existing App Router pages.

| Area | Checked routes | Missing pages |
| --- | ---: | ---: |
| Admin | 15 | 0 |
| Company | 13 | 0 |
| Nursery | 6 | 0 |

## Important Boundaries

- This change does not add real PG approval, refund, settlement, Alimtalk, delivery tracking, or external inventory API calls.
- Firebase/Firestore behavior remains unchanged.
- The change is limited to navigation consistency and route linkage.

