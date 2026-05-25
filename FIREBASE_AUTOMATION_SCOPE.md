# Firebase Automation Scope

Updated: 2026-05-25

## Automatically handled by Codex

- Firebase CLI project directory configuration for `a5-closed-mall`
- Firestore rules source creation and deployment
- Storage rules source creation and deployment
- Firebase Web SDK client initialization
- Firestore product read integration with mock fallback
- Firestore CMS/content collection names aligned to A5 closed mall rules
- Firebase Storage upload helper for CMS image/video beta uploads
- Firestore foundation seed script source
- Firestore product seed script source
- Next.js storefront/admin UI wiring that can use browser-safe Firebase Web SDK
- Local build/lint validation
- Git commit/push for non-secret source files when requested

## Current automatic integration status

| Area | Status |
| --- | --- |
| Firebase project link | Connected to `a5-closed-mall` |
| Firestore rules | Deployed once, source now expanded for A5 collections |
| Storage rules | Deployed once, source available |
| Products read | Connected with mock fallback |
| CMS Firestore writes | Code connected; requires signed-in user with proper claims |
| CMS Storage uploads | Code connected; requires signed-in user with proper claims |
| Seed scripts | Source ready; execution requires seed account credentials and claims |
| Orders/payments writes | Blocked until server payment flow is complete |
| PG | Interface/skeleton only |

## Safe automatic execution boundary

Codex can continue to generate or update:

- `lib/firebase/**`
- `lib/repositories/firebase/**`
- `components/firebase/**`
- `components/storefront/**`
- `app/**` Firebase read/write UI wiring
- `scripts/seed-firestore-*.mjs`
- `firestore.rules`
- `storage.rules`
- Firebase planning/report documents

Codex must not generate real secret values, service account private keys, PG secrets, or real settlement/refund execution logic.
