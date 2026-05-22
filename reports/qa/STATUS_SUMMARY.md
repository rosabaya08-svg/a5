# QA Status Summary

## Track

qa

## Local Status Route

`/qa/status`

## Purpose

The QA status dashboard gives a browser-visible local summary of this worktree's mock/test beta progress. It uses static mock data from `data/qa/statusMock.ts` and does not read real Firebase, Firestore/Auth, PG, refund, settlement, AlimTalk, delivery lookup, external inventory, or Storage services.

## Created Dashboard Files

- `app/qa/status/page.tsx`
- `components/qa/StatusDashboard.tsx`
- `data/qa/statusMock.ts`
- `reports/qa/STATUS_SUMMARY.md`
- `reports/qa/STATUS_DASHBOARD_ROUTE_MAP.md`
- `reports/qa/STATUS_DASHBOARD_STATE_COVERAGE.md`

## Displayed Status

| Item | Value |
| --- | --- |
| Track | qa |
| Major file count | 50+ |
| Firebase | No real connection |
| PG | Mock only |
| AlimTalk | Blocker |
| Delivery lookup | Blocker |
| External inventory API | Blocker |
| Storage | Spark limited, deferred |
| Production open | No |
| Real payment | No |

## Human Review Needed

- Confirm the dashboard renders after a human starts the local app.
- Confirm the fixture IDs still match the merged tablet-qr track.
- Confirm build/lint after all worktrees merge.
- Confirm PR/Issue template drafts should move to native `.github` template paths later.

