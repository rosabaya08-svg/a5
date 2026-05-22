# Mock UI route index

This index is for manual review on the next working day. These routes are static mock/test beta screens and do not perform live Firebase, PG, refund, settlement, Alimtalk, delivery tracking, or external inventory work.

## Routes

| Route | Purpose | Live integration status |
| --- | --- | --- |
| `/mock-ui/status` | Local worktree status dashboard | Mock only |
| `/mock-ui` | Preview hub for common state UI and route cards | Mock only |
| `/mock-ui/storefront` | Closed mall storefront, categories, benefits, price layer | Mock only |
| `/mock-ui/detail` | Product card, QR session card, order timeline | Mock only |
| `/mock-ui/checkout` | QR checkout summary and guest lookup | PG blocked |
| `/mock-ui/session` | QR lifecycle, tablet source, payer handoff | Firebase/PG blocked |
| `/mock-ui/journey` | End-to-end tablet to QR checkout journey | Mock decision map only |
| `/mock-ui/operations` | Approval queue, integration gates, smoke route matrix | Live actions blocked |
| `/mock-ui/qa` | Merge plan, manual checklist, release readiness | Manual only |
| `/mock-ui/analytics` | Mock sales, risk distribution, settlement preview | Payout blocked |

## Manual validation later

Do not run during unattended mode. For the next working day, the operator can manually run:

- `git status`
- `git pull origin main`
- worktree merge review
- `npm run lint`
- `npm run build`
- browser smoke for the routes above

## Safety notes

- No Firebase SDK import was added in the mock preview scope.
- No `.env` or Firebase config/rules file was created.
- No service account, private key, or secret was created.
- No live PG, refund, settlement, delivery, Alimtalk, or external inventory API code was added.
- Settlement and analytics values are mock visibility data only.
