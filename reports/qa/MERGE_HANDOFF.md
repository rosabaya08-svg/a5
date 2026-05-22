# QA Merge Handoff

## Purpose

This handoff mirrors the browser-visible `/qa/handoff` route and summarizes the order, owner, inputs, exit criteria, and blockers for the next human review day.

## Merge Order

1. `firebase-contract`
2. `qa`
3. `admin`
4. `company`
5. `nursery`
6. `tablet-qr`

## Track Handoff Table

| Order | Track | Owner | Inputs | Exit Criteria | Blockers |
| --- | --- | --- | --- | --- | --- |
| 01 | firebase-contract | contract owner | Firestore schema, Auth claims, server logic, seed plan, blockers | No config/rules files; contract blockers listed; adapter boundary clear | Rules, secrets, emulator approval pending |
| 02 | qa | QA owner | CI draft, route smoke, state coverage, report merge guide, preview hub | `/qa/status`, `/qa/routes`, `/qa/smoke`, `/qa/handoff`; reports updated; commit candidate recorded | Runtime checks not run; Next docs pending |
| 03 | admin | admin owner | Admin routes, management UI, risk logs, payment/settlement blockers | Admin route smoke ready; no live PG/refund/payout; reports complete | Dense table smoke and risk states pending |
| 04 | company | company owner | Company routes, product/inventory/order/payout mocks, external API blockers | Company smoke ready; Storage and inventory blocked; reports complete | Storage Blaze and external inventory pending |
| 05 | nursery | nursery owner | Nursery routes, room/tablet/pickup/QR history mocks, access states | Nursery smoke ready; tablet access states visible; reports complete | Customer data policy and notification pending |
| 06 | tablet-qr | tablet QR owner | Tablet routes, QR checkout, guest lookup, fixtures | Mobile smoke ready; PG mock only; stable fixture IDs; reports complete | Customer mobile review and PG transition blocked |

## Handoff Rules

- Do not merge a track with missing `AUTO_REPORT.md`, `NEXT_TASKS.md`, or `BLOCKERS.md`.
- Do not merge a track that creates `.env`, Firebase config, rules files, service accounts, private keys, secrets, live PG, deploy, or external API connections.
- Prefer owning-track changes for route/page conflicts.
- Preserve stable fixture IDs or update every QA document that references them.
- Run build/lint/route smoke only after human approval and merge preparation.

## Browser Handoff Route

Open `/qa/handoff` after a human starts the local app to view the same sequence in a visual hub.

