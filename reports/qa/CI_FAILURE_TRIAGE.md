# CI Failure Triage

## Purpose

This guide explains how to triage future CI failures after a human pushes the mock/test beta branch. It does not ask unattended Codex to run install, lint, build, git, deploy, Firebase, PG, or secret-related commands.

## Failure Categories

| Category | Signal | First Owner | First Action |
| --- | --- | --- | --- |
| Dependency install | `npm ci` fails | QA owner | Confirm lockfile/package mismatch after merge. |
| Lint | `npm run lint` fails | Owning feature track | Fix import, unused variable, JSX, accessibility, or formatting issue. |
| Build/type | `npm run build` fails | Owning feature track | Fix route, import, type, or syntax issue. |
| Route render | App builds but route crashes | Owning route track | Compare route against `ROUTE_SMOKE_CHECKLIST.md`. |
| State coverage | Route renders but required state missing | Owning route track | Compare route against `STATE_COVERAGE_MATRIX.md`. |
| Production safety | CI or review finds secret/config/live adapter | Tech lead | Stop merge and record P0 blocker. |

## Triage Order

1. Identify the first failing job.
2. Assign owner using `reports/qa/ROUTE_OWNER_MATRIX.md`.
3. Check whether the failure maps to a known blocker.
4. If production safety is involved, stop all lower-priority triage.
5. If build/type fails, do not spend time on visual route smoke until fixed.
6. If route smoke fails, preserve the route URL, viewport, and owner.
7. If state coverage fails, record the missing state and expected behavior.

## Common Build Failure Suspects

- Malformed mock data strings or object literals.
- Route folder path does not match checklist URL.
- Cross-track import points to a file not merged yet.
- Type field added in one track but missing from shared type definitions.
- Client/server component boundary changed by Next.js version-specific behavior.
- Asset placeholder path missing from `public`.

## Production Safety Stop Conditions

- `.env`, Firebase config, rules file, service account, private key, or secret-looking file appears.
- Live PG script, live checkout URL, real payment token, or refund/payout action appears.
- Firebase SDK import appears in a route that should be mock-only.
- Shipping, notification, or external inventory API client appears outside a mock/stub adapter.

