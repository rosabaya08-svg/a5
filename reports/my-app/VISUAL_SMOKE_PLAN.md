# my-app visual smoke plan

This checklist is for manual browser review on `localhost:3000`. It must be run by a person after the local dev server is started manually. No `npm run lint`, `npm run build`, deploy, Firebase, PG, or external API command was executed during unattended work.

## 2026-05-22 storefront/admin UX smoke additions

1. Open `/products`.
   - Confirm it renders the same customer-facing shopping mall catalog as `/tablet/products`.
   - Confirm mock/test beta, Firebase connection 없음, PG connection 없음, production 아님 badges are visible.

2. Open `/tablet/products`.
   - Confirm HANSANYEON-style closed mall hero banner is visible.
   - Confirm nursery/room/tablet/QR expiry context strip is visible.
   - Confirm promo banner grid, brand logo grid, category tabs, search/filter/sort controls, and product image cards are visible.

3. Open `/tablet/products/product-care-kit`.
   - Confirm product image gallery, normal price, closed mall price, discount rate, mock AI price comparison layer, option chips, detail/review/shipping tabs, and mobile sticky CTA are visible.

4. Open `/tablet/cart` and `/tablet/qr`.
   - Confirm cart quantities, option labels, fulfillment method, total amount, QR generation CTA, session expiry notice, and no real payment language are visible.

5. Open `/q/SANHO701`, `/q/SANHO701/checkout`, `/q/SANHO701/status`, and `/q/SANHO701/expired`.
   - Confirm the pages look like mobile customer payment entry screens.
   - Confirm PG is mock only and there is no live payment request.

6. Open `/orders/guest`, `/orders/guest/A5-20260519-001`, and `/orders/guest/A5-20260519-001/refund`.
   - Confirm guest order lookup, order timeline, fulfillment status, and refund request mock are visible.
   - Confirm no real refund/settlement behavior exists.

7. Open `/admin/marketing/banners`, `/admin/marketing/videos`, `/admin/brands`, `/admin/home-editor`, and `/admin/exhibitions`.
   - Confirm banner/video/brand/exhibition/home editing are mock management screens.
   - Confirm upload/approval/scheduling controls are placeholders only.

8. Open `/company/products/preview`, `/company/ads/banners`, `/company/ads/videos`, `/company/brand`, and `/company/exhibitions`.
   - Confirm company-facing product preview, ad submission, brand room, and exhibition application mock screens are visible.
   - Confirm Firebase Storage upload and real external API submission are not present.

9. Re-open `/mock-ui/status`.
   - Confirm progress, generated file groups, route list, blockers, worktree ports, and 404 record mention the latest storefront/admin UX batch.

## Start point

1. Open `http://localhost:3000`.
2. Confirm the top page says mock/test beta and does not imply production launch.
3. Confirm the original 6 domain cards are still visible.
4. Confirm the section `자동 생성 결과 확인` is visible.
5. Confirm every generated result card has badges:
   - `mock/test beta`
   - `Firebase 연결 없음`
   - `PG 연결 없음`
   - `운영 배포 아님`

## Click sequence

1. Open `/mock-ui/status`.
   - Check overall progress card.
   - Check generated file groups.
   - Check route map.
   - Check blocked live integrations.
   - Check worktree port guide: admin 3001, company 3002, nursery 3003, tablet-qr 3004, firebase-contract 3005, qa 3006.

2. Open `/mock-ui/smoke`.
   - Check the visual smoke checklist cards.
   - Confirm route links are browser-only manual review links.
   - Confirm the page says it does not run git, lint, build, deploy, Firebase, PG, or external APIs.

3. Open `/mock-ui/merge`.
   - Check merge review order.
   - Check pre-merge forbidden file/import checks.
   - Check worktree port guide.

4. Open `/mock-ui`.
   - Check route cards.
   - Check empty/error/risk state examples.
   - Check filter/search/sort mock panel.

5. Open `/mock-ui/storefront`.
   - Check closed mall hero.
   - Check category cards.
   - Check product cards and price layer.

6. Open `/products`.
   - Confirm it no longer returns 404.
   - Confirm it shows the customer product list mock/test beta screen.
   - Confirm the top badges are visible: mock/test beta, Firebase 연결 없음, PG 연결 없음, 운영 배포 아님.

7. Open `/tablet/products`.
   - Check customer-facing product list.
   - Confirm it still shows mock/test data only.

8. Open `/tablet/cart`.
   - Check quantity, option, fulfillment, total, and QR entry.

9. Open `/tablet/qr`.
   - Check QR code placeholder, short code, expiry, and mobile link.

10. Open `/q/SANHO701`.
   - Check mobile customer QR landing.
   - Confirm no customer login is required.

11. Open `/q/SANHO701/checkout`.
   - Check checkout mock summary.
   - Confirm no live PG wording or real payment action appears.

12. Open `/orders/guest/A5-20260519-001`.
   - Check guest order detail.
   - Confirm refund/settlement remain mock-only states.

13. Open `/mock-ui/qa`.
    - Check manual checklist and release readiness blockers.

14. Open `/company/dashboard`.
    - Confirm company dashboard is reachable.
    - Open `/company/products`.
    - Confirm company product route does not imply live payout or external inventory sync.

15. Open `/nursery/dashboard`.
    - Confirm nursery dashboard is reachable.
    - Open `/nursery/rooms`.
    - Confirm nursery room route does not query real customer data.

16. Review `/mock-ui/status`.
    - Confirm all worktree route status cards are visible.
    - Confirm route-by-route 404 record is visible.

## Visual pass criteria

- No blank page.
- No obvious overlapping text in desktop viewport.
- Cards are readable on narrow screens.
- Safety badges are visible.
- Firebase/PG/Storage/API blockers remain visible.
- Mock/test beta language is explicit.
- Real payment, real refund, real settlement, real deployment are not implied.

## Deferred checks

- TypeScript validation is deferred until manual `npm run build`.
- ESLint validation is deferred until manual `npm run lint`.
- Git staging/commit is deferred until manual review.
