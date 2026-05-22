# QA Risk Register

## Purpose

This register tracks integration risks for the mock/test beta workstream. It is scoped to review, merge, route smoke, state coverage, and production-safety risk. It does not approve live Firebase, PG, Storage, shipping, notification, settlement, refund, or external inventory integration.

| ID | Risk | Severity | Likelihood | Impact | Early Signal | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| QA-R01 | Parallel file conflict between worktrees | High | Medium | Merge delays or lost UI changes | Same shared file touched by multiple tracks | Use `MERGE_PLAN.md` ownership and merge order | Tech lead |
| QA-R02 | Mock data mismatch across admin/company/nursery/tablet QR | High | High | Route detail pages show missing or inconsistent IDs | Broken links, empty detail pages, failed smoke route | Reconcile IDs after tablet-qr merge; prefer stable snapshots | QA + feature owners |
| QA-R03 | Firebase connection prohibition violated | Critical | Low | Production-risk config or SDK path enters mock beta | `.env`, Firebase config/rules, live repository imports | Stop merge, remove config, record P0 blocker | Tech lead |
| QA-R04 | Real PG implementation mistaken for mock checkout | Critical | Low | Accidental real payment or misleading checkout state | PG script, live checkout URL, payment token naming | Keep PG blocked messaging and mock adapter only | Tablet QR owner |
| QA-R05 | Storage Blaze remains on hold | Medium | High | Product image/GIF upload cannot be tested with real Storage | Placeholder-only image states | Keep placeholders; document Storage blocker | Firebase/Company owners |
| QA-R06 | Build not run during unattended generation | High | High | Syntax/type issues discovered late | CI or local build fails after merge | Run clean install/lint/build after merge | QA owner |
| QA-R07 | Next.js docs unavailable in current worktree | Medium | Medium | Workflow assumptions may miss version-specific change | Missing `node_modules/next/dist/docs/` | Review docs after dependencies are present | QA owner |
| QA-R08 | Mobile QR flow overlaps or hides actions | High | Medium | Customer flow unusable on phone | 360px/430px visual failure | Use state matrix responsive breakpoints | Tablet QR owner |
| QA-R09 | Access role assumptions drift from Firebase contract | High | Medium | Users see wrong admin/company/nursery/tablet data | Missing tenant IDs or role labels | Use access checklist and contract docs | Firebase + feature owners |
| QA-R10 | Blockers are scattered across track reports | Medium | High | Release decision misses critical issue | Multiple P1/P0 blockers in separate folders | Use `REPORT_MERGE_GUIDE.md` combined blocker table | QA owner |

## Risk Severity Rules

- Critical: Could cause real production action, credential exposure, payment, data leak, or irreversible operation.
- High: Blocks mock beta build, route smoke, merge, or customer flow review.
- Medium: Requires owner decision but does not block all mock beta work.
- Low: Polish or documentation gap.

