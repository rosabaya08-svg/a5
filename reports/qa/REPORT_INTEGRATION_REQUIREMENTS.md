# Report Integration Requirements

## Purpose

This document expands the BLOCKERS, AUTO_REPORT, and NEXT_TASKS integration guidance for batches 36-39.

## Required AUTO_REPORT Fields

| Field | Requirement |
| --- | --- |
| Track | Must name one of `firebase-contract`, `qa`, `admin`, `company`, `nursery`, `tablet-qr`. |
| Summary | Must describe completed work in mock/test beta terms. |
| Files added | Must list new files or state none. |
| Files modified | Must list modified files or state none. |
| Completed batches | Must map requested batches to Done/Partial/Skipped. |
| Skipped items | Must explain why without asking a question. |
| Verification | Must state whether build/lint/smoke were not run, passed, failed, or blocked. |
| Guardrails | Must confirm no prohibited production integration. |

## Required BLOCKERS Fields

| Field | Requirement |
| --- | --- |
| Priority | P0/P1/P2/P3. |
| Track | Owning track or `cross-track`. |
| Blocker | Concrete issue, not a vague concern. |
| Impact | Route, state, build, merge, security, or release impact. |
| Required decision | Person/owner decision if needed. |
| Recommended next step | Safe action that preserves mock/stub boundary. |

## Required NEXT_TASKS Fields

| Field | Requirement |
| --- | --- |
| Horizon | 1 day, 3 days, 5 days, 10 days. |
| Priority | P0/P1/P2/P3. |
| Owner | Track or person role. |
| Task | One concrete next action. |
| Exit criteria | Observable completion condition. |
| Dependencies | Related blockers or tracks. |

## Merge Rules

- Missing reports become P1 blockers.
- P0 blockers override all release notes.
- Duplicates are merged into one combined row with all affected tracks.
- Production integration requests stay blocked until transition checklist approval.

