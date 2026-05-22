# QA Route Index

## Purpose

This route index documents the browser-visible QA preview hub created for the `my-app-qa` worktree. It is mock/test beta only and does not query real Firebase, Firestore/Auth, PG, refund, settlement, AlimTalk, delivery lookup, external inventory, Storage, or deployment services.

## QA Preview Routes

| Route | Screen | File | Purpose |
| --- | --- | --- | --- |
| `/qa/status` | QA status dashboard | `app/qa/status/page.tsx` | Progress, blockers, next tasks, service status, and smoke route links. |
| `/qa/routes` | QA route index hub | `app/qa/routes/page.tsx` | Browser-visible route groups by owner track and route purpose. |
| `/qa/smoke` | QA visual smoke checklist | `app/qa/smoke/page.tsx` | Manual browser review checklist for routes, states, responsive behavior, and production safety. |
| `/qa/handoff` | QA merge handoff hub | `app/qa/handoff/page.tsx` | Worktree merge sequence, inputs, exit criteria, and blockers. |

## Shared Components And Data

| File | Purpose |
| --- | --- |
| `components/qa/StatusDashboard.tsx` | Existing local status dashboard. |
| `components/qa/RouteIndexHub.tsx` | Route index and preview cards. |
| `components/qa/VisualSmokeChecklist.tsx` | Browser-readable smoke checklist. |
| `components/qa/MergeHandoffHub.tsx` | Merge sequence and blocker handoff screen. |
| `data/qa/statusMock.ts` | Static status dashboard data. |
| `data/qa/routeHubMock.ts` | Static route index, smoke, and handoff data. |

## Critical Route Groups

| Group | Owner | Routes |
| --- | --- | --- |
| QA hub | qa | `/qa/status`, `/qa/routes`, `/qa/smoke`, `/qa/handoff` |
| Admin | admin | `/admin/dashboard`, `/admin/companies`, `/admin/products` |
| Company | company | `/company`, `/company/inventory`, `/company/payouts` |
| Nursery | nursery | `/nursery`, `/nursery/tablets`, `/nursery/qr-history` |
| Tablet QR and guest | tablet-qr | `/tablet/products`, `/tablet/cart`, `/q/SANHO701`, `/orders/guest/A5-20260519-001` |

## Review Notes

- Route cards are static anchors and should be checked after a human starts the local app.
- Missing route, hard crash, blank page, or stale fixture ID should be recorded as a route smoke blocker.
- Production integrations must remain blocked even when a route has a call-to-action style UI.

