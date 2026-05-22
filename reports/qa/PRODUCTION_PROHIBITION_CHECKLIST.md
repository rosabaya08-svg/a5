# Production Prohibition Checklist

## Purpose

This checklist makes the mock/test beta non-production boundary explicit.

## Prohibited In Mock/Test Beta

- [ ] No real payment.
- [ ] No real refund.
- [ ] No settlement payout.
- [ ] No operating deployment.
- [ ] No `.env` creation.
- [ ] No secret creation.
- [ ] No private key creation.
- [ ] No service account creation.
- [ ] No Firebase config file creation.
- [ ] No Firestore or Storage rules file creation.
- [ ] No live Firebase SDK connection.
- [ ] No live Firestore/Auth connection.
- [ ] No live PG script, checkout URL, token, or webhook.
- [ ] No SMS/AlimTalk send.
- [ ] No delivery tracking API call.
- [ ] No external inventory API call.
- [ ] No real customer phone, address, payment, bank, or identity data in mock fixtures.

## Failure Classification

| Finding | Severity | Action |
| --- | --- | --- |
| Secret/private key/service account appears | P0 | Stop merge and remove from repository history plan. |
| Live payment/refund/payout path appears | P0 | Stop merge and replace with mock-blocked state. |
| Firebase config/rules file appears early | P0/P1 | Stop merge until contract approval. |
| External API client appears outside mock adapter | P1 | Isolate to stub or remove. |
| UI wording implies real operation is active | P1 | Rewrite as mock/test only. |

