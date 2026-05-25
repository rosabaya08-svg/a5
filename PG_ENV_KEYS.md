# PG_ENV_KEYS

Do not commit real values. `.env.local.example` and `functions/.env.example` contain key names only.

## Cloudflare Pages / Browser Public Values

| Key | Purpose |
| --- | --- |
| `NEXT_PUBLIC_PG_PROVIDER` | PG provider id shown in UI and passed to browser bridge |
| `NEXT_PUBLIC_PG_ENVIRONMENT` | `test` or `production`; keep `test` for the first integration |
| `NEXT_PUBLIC_PG_CLIENT_KEY` | Browser SDK client key |
| `NEXT_PUBLIC_PG_CHANNEL_KEY` | Channel/store key if the PG provider requires it |
| `NEXT_PUBLIC_PG_MERCHANT_ID` | Public merchant identifier if required |
| `NEXT_PUBLIC_PG_SCRIPT_URL` | Optional hosted PG SDK script URL |
| `NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL` | Firebase Functions base URL, e.g. `https://asia-northeast3-a5-closed-mall.cloudfunctions.net` |

## Firebase Functions / Server Secret Values

| Key | Purpose |
| --- | --- |
| `PG_PROVIDER` | Provider id used by server adapter |
| `PG_ENVIRONMENT` | `test` first, `production` only after approval |
| `PG_CLIENT_KEY` | Server-side public/client key copy if provider SDK requires it |
| `PG_SECRET_KEY` | Server confirm/cancel/refund secret |
| `PG_MERCHANT_ID` | Merchant id/MID |
| `PG_CHANNEL_KEY` | Channel key/store id |
| `PG_WEBHOOK_SECRET` | Webhook signature validation secret |
| `PG_API_BASE_URL` | Provider API base URL |
| `PG_READY_ENDPOINT` | Provider prepare endpoint if required |
| `PG_CONFIRM_ENDPOINT` | Provider confirm/approve endpoint |
| `PG_CANCEL_ENDPOINT` | Provider cancel endpoint |
| `PG_WEBHOOK_VERIFY_ALGORITHM` | Signature algorithm name from official docs |
| `PG_SUCCESS_URL` | Customer success redirect URL |
| `PG_FAIL_URL` | Customer fail redirect URL |
| `PG_WEBHOOK_URL` | Webhook URL registered in PG console |

## Safety

- `PG_SECRET_KEY` and `PG_WEBHOOK_SECRET` must never be exposed to browser code.
- Production keys must not be placed in `.env.local.example`, docs, screenshots, reports, or commit messages.
- First test must use PG sandbox/test mode only.
