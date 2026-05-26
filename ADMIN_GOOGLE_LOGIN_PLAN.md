# A5 최고관리자 Google 로그인

## 적용 내용

- 최고관리자 로그인 경로: `/admin/login`
- 인증 방식: Firebase Authentication Google provider
- 마스터 이메일: `rosabaya08@gmail.com`
- 클라이언트 세션 저장 키: `a5.super-admin.session`
- 허용되지 않은 Google 계정은 즉시 로그아웃 처리하고 콘솔 진입을 차단한다.

## 운영 전 확인

1. Firebase Console > Authentication > Sign-in method에서 Google provider를 활성화한다.
2. 승인된 도메인에 Cloudflare Pages 도메인과 커스텀 도메인을 등록한다.
3. 최고관리자 권한은 이후 Functions/Admin SDK에서 Custom Claims `SUPER_ADMIN`으로 보강한다.
4. 이 화면에는 OAuth secret, service account, private key를 저장하지 않는다.

## 다음 단계

- `/admin/**` route guard 적용 여부 결정
- Firebase ID token을 Functions로 전달해 `SUPER_ADMIN` claim을 검증하는 서버 가드 추가
- 최고관리자 세션 만료/로그아웃 정책 확정
