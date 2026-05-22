# QA Visual Smoke Plan

## Purpose

This plan explains how to use `/qa/smoke` and the segmented checklist documents for a browser-based human review. It is not an instruction for unattended Codex to run `npm install`, build, lint, deploy, Firebase, PG, or external service commands.

## Browser Screens To Open

| Order | Route | Purpose | Primary Viewports |
| --- | --- | --- | --- |
| 1 | `/qa/status` | Confirm QA progress and blocker summary. | 360px, 768px, 1440px |
| 2 | `/qa/routes` | Confirm route index and preview cards. | 360px, 768px, 1440px |
| 3 | `/qa/smoke` | Follow smoke checklist. | 360px, 768px, 1440px |
| 4 | `/qa/handoff` | Confirm merge order and blockers. | 768px, 1440px |
| 5 | `/admin/dashboard` | Admin dense route smoke. | 1440px |
| 6 | `/company` | Company route smoke. | 768px, 1440px |
| 7 | `/nursery` | Nursery route smoke. | 768px, 1440px |
| 8 | `/tablet/products` | Tablet product route smoke. | 768px, 1024px |
| 9 | `/q/SANHO701` | Customer QR route smoke. | 360px, 430px |
| 10 | `/orders/guest/A5-20260519-001` | Guest order detail smoke. | 360px, 430px |

## Smoke Categories

| Category | Pass Signal | Fail Signal |
| --- | --- | --- |
| Route render | Page loads and shows route-specific content. | Hard crash, blank page, route not found, or hydration failure. |
| Mock/test boundary | Visible mock/test beta or production-blocked wording. | UI implies live operation, live payment, or production launch. |
| State coverage | empty/loading/error/risk/blocked states are visible or clearly documented. | Critical customer path lacks error or blocked state. |
| Responsive layout | Text, buttons, route cards, and status badges remain readable. | Overlap, clipped button, hidden primary action, or unreadable table. |
| Production safety | Firebase/PG/refund/settlement/external services stay blocked. | Live SDK/client/secret/config or real action wording appears. |

## Recording Template

| Route | Viewport | Result | Evidence | Owner | Next Step |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | Pass / Fail / Blocked | Screenshot/path/note | TBD | TBD |

## Known Pending Items

- Runtime browser review has not been performed in unattended mode.
- Existing unrelated source encoding/syntax issues may block the local app before QA routes render.
- Route cards must be reconciled after all UI tracks merge.

