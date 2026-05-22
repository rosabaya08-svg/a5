# Blocker Severity Model

## Purpose

This model keeps blocker priority consistent when integrating reports from every track.

## Severity Levels

| Priority | Meaning | Examples | Release Impact |
| --- | --- | --- | --- |
| P0 | Production safety or irreversible risk | Secret committed, service account, live payment, live refund, real payout, production deploy, real customer data exposure | Release hold |
| P1 | Mock beta blocker | Build failure, route crash, missing critical customer QR state, broken role boundary, missing track report, stale fixture ID blocking smoke | Mock beta hold until owned/fixed |
| P2 | Review quality issue | Responsive overlap, missing non-critical empty state, unclear copy, incomplete table sort, draft release wording | Can proceed only with owner and note |
| P3 | Polish/future task | Nice-to-have layout polish, extra fixture, expanded docs | Does not block mock beta |

## Escalation Rules

- Any secret-like file or live integration becomes P0 even if it appears unused.
- Any customer-facing QR/checkout/guest order route crash is P1 minimum.
- Any UI that implies real payment/refund/payout is live becomes P0/P1 depending on whether live code exists.
- Any missing report from a track is P1 because it hides blocker status.
- Any stale route/sample ID is P1 if it blocks route smoke.

## Blocker Record Template

| Priority | Track | Finding | Evidence | Owner | Required Action |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD | TBD |

