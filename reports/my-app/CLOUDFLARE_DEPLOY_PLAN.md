# Cloudflare Pages Static Export Plan

작성일: 2026-05-22

## 실패 원인

Cloudflare Pages 빌드 로그에서 `npx next build`, TypeScript 검사, static page generation은 성공했지만 마지막에 `Error: Output directory "out" not found`가 발생했다.

Next.js App Router 프로젝트를 Cloudflare Pages Static HTML Export 방식으로 배포하려면 `next.config.ts`에서 `output: "export"`가 활성화되어야 한다. 이 설정이 없거나 Cloudflare의 output directory가 `out`과 맞지 않으면 Cloudflare가 배포 산출물 폴더를 찾지 못해 실패한다.

## 확인한 Next.js 기준

- 로컬 Next.js 문서 기준 static export는 `next.config.js/ts`의 `output: "export"`로 활성화한다.
- `next build` 후 HTML/CSS/JS 정적 자산은 `out` 폴더에 생성된다.
- static export는 서버 런타임 기능이 필요한 API/SSR 기능을 사용할 수 없다.
- `next/image` 최적화 서버를 쓰지 않는 정적 배포에서는 `images.unoptimized: true` 또는 별도 image loader가 필요하다.

## 적용 상태

`next.config.ts`는 현재 아래 요구사항을 충족한다.

```ts
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};
```

`/products` route도 이미 존재하며, 고객용 상품 목록 mock/test beta 화면인 `/tablet/products` 구조를 재사용한다.

## Cloudflare Pages 설정 권장값

| 항목 | 값 |
| --- | --- |
| Framework preset | Next.js 또는 None |
| Build command | `npm run build` 또는 `npx next build` |
| Build output directory | `out` |
| 환경 변수 | 이번 단계에서는 추가 금지 |

## 검증 결과

| 검증 항목 | 결과 |
| --- | --- |
| `npm run build` | 로컬 PowerShell 실행 정책으로 `npm.ps1` 로드가 차단됨 |
| `npm.cmd run build` | 성공 |
| TypeScript | 성공 |
| Static page generation | 72개 route 성공 |
| `out` 폴더 생성 | 성공 |
| `/products` export | `out/products.html` 및 route data 산출물 생성 확인 |

## 유지한 금지사항

- Firebase 실제 연결 없음
- PG/환불/정산/알림톡/배송조회/외부 재고 API 연결 없음
- Storage 연결 없음
- `.env`, Secret Key, service account 생성 없음
- `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules` 생성 없음
- git add/commit/push 실행 없음

## 다음 확인

1. Cloudflare Pages의 output directory가 반드시 `out`인지 확인한다.
2. Cloudflare 빌드 명령이 `npm run build` 또는 `npx next build`인지 확인한다.
3. Cloudflare 빌드 환경에서 Node/Next 버전이 로컬 빌드와 충돌하지 않는지 확인한다.
4. 배포 후 `/`, `/products`, `/tablet/products`, `/mock-ui/status`, `/q/SANHO701`, `/orders/guest/A5-20260519-001`를 순서대로 smoke 확인한다.
