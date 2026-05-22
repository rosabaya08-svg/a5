# QA Status Dashboard State Coverage

## Purpose

This document maps the local `/qa/status` dashboard to the required mock/test beta state language.

## State Coverage

| State | Dashboard Evidence | Runtime Verification |
| --- | --- | --- |
| `empty` | Empty/no-result expectations are listed in state coverage cards. | Pending human browser review. |
| `loading` | Loading expectations are listed as mock checklist coverage, not live async behavior. | Pending human browser review. |
| `error` | Invalid route, QR, order lookup, and payment failure cases are listed. | Pending human browser review. |
| `normal` | Dashboard summary, file count, route map, and next tasks render from static mock data. | Pending human browser review. |
| `risk` | Build/lint not run, stale fixture IDs, and Storage limitation are represented as risk/blocker items. | Pending human browser review. |
| `blocked` | Firebase, AlimTalk, delivery lookup, external inventory, and production services are shown as blocked. | Pending human browser review. |
| `mock_ready` | QA docs are summarized as ready for human review after merge. | Pending human browser review. |
| `production_blocked` | Hero and status cards explicitly say no production open and no real payment. | Pending human browser review. |

## Responsive Coverage

| Viewport | Expected Behavior |
| --- | --- |
| 360px mobile | Cards stack, route links remain tappable, hero labels wrap safely. |
| 430px mobile | Next task and blocker lists remain readable. |
| 768px tablet | Summary cards form a two-column grid where space allows. |
| 1024px tablet landscape | Route map cards use multiple columns. |
| 1440px desktop | Full dashboard displays dense but scannable sections. |

## Blockers

- Browser rendering is not verified because unattended instructions prohibit running build/lint and do not request starting a dev server.
- Existing unrelated source files may still contain mojibake or syntax issues that can block the app before `/qa/status` is reached.

