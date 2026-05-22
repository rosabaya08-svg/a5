# Admin State Coverage

## Entity States

| Area | States Covered |
| --- | --- |
| Company | pending, approved, suspended, rejected |
| Nursery | pending, approved, suspended, rejected |
| Product | draft, pending_approval, approved, rejected, suspended |
| Order | paid, ready_for_pickup, shipping, refund_requested, cancelled |
| Payment | approved_mock, cancel_requested, failed_mock |
| Refund | requested, reviewing, approved_mock, rejected, blocked_real_pg_required |
| Settlement | pending, confirmed_mock, payout_ready_mock, blocked_real_payout |
| QR source | active, paid, expired, cancelled |
| Delivery | invoice_pending, invoice_entered, in_transit, delivered |
| Pickup | pickup_ready, picked_up |
| Integration | mock_ready, official_docs_required, secret_required, production_blocked |
| Inventory sync | mock_ready, official_docs_required, secret_required, blocked |
| Risk | high, medium, low |
| Risk badge | mock_ready, blocked, needs_approval, production_forbidden, docs_required |
| Permission production action | forbidden, server_required, not_applicable |
| Export preview | mock_ready, needs_approval, production_forbidden |
| SLA aging | company_approval, product_approval, refund, settlement, risk |
| Data quality | qr_source, room, settlement_account, tablet, product_price |
| Release readiness | mock_ready, blocked, needs_approval, docs_required |

## UI States

| State | Coverage |
| --- | --- |
| Empty | AdminEmptyState across detail and integration surfaces |
| Error | AdminErrorState for PG, search, stock, tablet context, QR source |
| Loading | AdminLoadingState in company detail tab mock |
| Search | AdminSearchSortBar and AdminDataSurface |
| Filter | Static filter chips on major tables |
| Sort | Static sort pills on major tables |
| Pagination | AdminPagination on major tables |
| Mobile | AdminCompactRecordList and responsive grids |
| Confirm | AdminConfirmModal for approval, payout, refund, product |
| Timeline | AdminActionTimeline and detail timeline events |
| Data surface | AdminDataSurface with table, search, filters, sort, pagination, empty, error |
| Status dashboard | Progress, route smoke list, blockers, next tasks, human review, state coverage |
| Preview hub | AdminRoutePreviewGrid cards with title, path, status, coverage, blocker, and nextTask |
| Route aliases | `/admin/delivery` and `/admin/risk-center` preferred visual smoke routes |
| Route state matrix | `/admin/status` lists empty, loading, error, and risk coverage notes per preview route |

## Safety Coverage

- Firebase, Firestore/Auth, PG, payout, refund execution, notification send, delivery lookup, and external inventory sync are represented as blocked/mock states only.
- No environment, secret, Firebase config, rules, deploy, build, lint, or git command is required for this admin mock state coverage.
