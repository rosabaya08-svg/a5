# Mock/Test Beta Release Criteria

## Purpose

This document defines the minimum criteria for a mock/test beta package. It does not approve production release, real payment, real refund, settlement payout, Firebase connection, Storage upload, notification sending, delivery lookup, or external inventory API integration.

## Required Gates

| Gate | Criteria | Status |
| --- | --- | --- |
| UI complete | Admin, company, nursery, tablet, QR, and guest flows render route-level mock screens. | Pending route smoke |
| Mock data | Stable product, order, QR, payment, inventory, and audit fixtures exist and are internally consistent. | Pending ledger review |
| Repository boundary | Mock/stub adapters remain separate from future Firebase/PG/Storage adapters. | Pending code review |
| State coverage | P0/P1 `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `mock_ready`, `production_blocked` states are covered. | Pending manual review |
| Route smoke | Required route families pass desktop/tablet/mobile smoke checks. | Pending |
| Build/lint | Clean build and lint pass after human-run verification. | Pending |
| Report merge | All track reports are merged through `REPORT_MERGE_GUIDE.md`. | Pending |
| Production safety | No secrets, config, rules files, real SDK integration, deploy, PG, refund, payout, notification, shipping, or external inventory calls. | Required |

## Release Decision

| Decision | Allowed Use | Conditions |
| --- | --- | --- |
| Hold | No stakeholder demo | Any P0, unowned P1, production-risk issue, or build-blocking issue remains. |
| Mock beta only | Internal UI/mock review | No P0, P1 issues owned, production integrations blocked, routes mostly reviewable. |
| Ready for implementation planning | Plan real integrations | Mock beta stable, blockers triaged, Firebase/PG/Storage transition gates approved. |

