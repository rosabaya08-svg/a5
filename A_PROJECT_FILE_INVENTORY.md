# A Project File Inventory

작성일: 2026-05-19

## 1. 점검 범위

- 사용자 요청 루트: `C:\Users\djfh\Desktop\my-app`
- 실제 활성 workspace/git 루트: `C:\Users\djfhl\Desktop\my-app`
- 비고: 사용자 요청 루트는 현재 시스템에서 존재하지 않았고, 실제 작업은 활성 workspace 기준으로 읽기/보고서 작성만 수행했다.

## 2. 최상위 구조

```text
C:\Users\djfhl\Desktop\my-app
├─ .git/
├─ .next/
├─ a5-learning/
├─ app/
├─ node_modules/
├─ public/
├─ .gitignore
├─ AGENTS.md
├─ CLAUDE.md
├─ eslint.config.mjs
├─ next-env.d.ts
├─ next.config.ts
├─ package-lock.json
├─ package.json
├─ postcss.config.mjs
├─ README.md
└─ tsconfig.json
```

## 3. 요청 파일/디렉터리 존재 여부

| 항목 | 존재 여부 | 확인 내용 |
| --- | --- | --- |
| `package.json` | 있음 | Next.js 16.2.6, React 19.2.4, Tailwind CSS 4, TypeScript 5 계열 |
| `next.config.ts` | 있음 | 기본 `NextConfig` 객체, 별도 설정 없음 |
| `app/` | 있음 | `favicon.ico`, `globals.css`, `layout.tsx`, `page.tsx` |
| `public/` | 있음 | 기본 SVG 5개: `file`, `globe`, `next`, `vercel`, `window` |
| `AGENTS.md` | 있음 | Next.js 작업 전 `node_modules/next/dist/docs/` 확인 지시 포함 |
| `CLAUDE.md` | 있음 | `@AGENTS.md` 참조만 있음 |
| `README.md` | 있음 | create-next-app 기본 README |

## 4. App Router 현재 파일

| 파일 | 상태 요약 |
| --- | --- |
| `app/layout.tsx` | create-next-app 기본 레이아웃에 가까움. `lang="en"`, Geist 폰트, 기본 metadata 사용 |
| `app/page.tsx` | "Next.js 설치 성공" 메시지를 중앙에 표시하는 단일 화면 |
| `app/globals.css` | 기본 전역 스타일 파일 |
| `app/favicon.ico` | 기본 favicon |

## 5. Public 자산

현재 `public/`에는 create-next-app 기본 SVG 자산만 있다.

- `file.svg`
- `globe.svg`
- `next.svg`
- `vercel.svg`
- `window.svg`

## 6. a5-learning 문서 인벤토리

| 파일 | 비고 |
| --- | --- |
| `A_PROJECT_WORK_ANALYSIS.md` | 문서 기반 업무 분석 요약 |
| `CODING_MATERIALS_GENERATION_PREP.md` | 코딩 전 준비/금지/보고서 기준 |
| `codex_final_master_learning_directive_v1.docx` | 최종 학습/작업 지시서 |
| `sanho_closed_mall_uiux_master_v1.docx` | 산후조리원 폐쇄몰 UI/UX·기술 설계 |
| `fast25_ai_automation_shoppingmall_plan_v1.docx` | 25작업일 베타 자동화 계획 |
| `codex_nextjs_harness_project_documentation_v2.docx` | Codex × Next.js 하네스 실행 문서 |
| `codex_nextjs_error_review_guardrails_v3.docx` | 오류 재검토 및 안전 가드레일 |
| `codex_nextjs_coding_documentation_v1-1.docx` | Next.js 코딩 실행 문서 |
| `codex_nextjs_coding_documentation_v1-2.docx` | v1-1과 중복본으로 문서상 언급됨 |
| `.codex_docx_text/` | DOCX 텍스트 추출본과 산호 문서 이미지 추출본 포함 |

## 7. Firebase 관련 파일 존재 여부

현재 프로젝트 루트와 주요 하위 경로에서 Firebase 관련 파일은 발견되지 않았다.

| 항목 | 상태 |
| --- | --- |
| `firebase.json` | 없음 |
| `.firebaserc` | 없음 |
| `firestore.rules` | 없음 |
| `storage.rules` | 없음 |
| Firebase client/admin 설정 파일 | 없음 |
| `.env*` 파일 | 없음 |
| service account/private key 파일 | 없음 |
| `package.json` Firebase dependency | 없음 |

## 8. Git 상태

- 현재 브랜치: `main`
- 상태: `## main...origin/main`
- 원격 저장소:
  - fetch: `https://github.com/rosabaya08-svg/a5.git`
  - push: `https://github.com/rosabaya08-svg/a5.git`
- 보고서 작성 전 기준으로 working tree는 clean 상태였다.

## 9. 현재 판단

현재 저장소는 Next.js App Router 기본 프로젝트에 `a5-learning` 문서팩이 추가된 상태로 보인다. 학습 문서가 요구하는 폐쇄몰, 관리자, 기업 Admin, 산후조리원 Admin, 태블릿, QR 결제, mock adapter, Firebase 권한/원장 구조는 아직 프로젝트 코드/설정으로 구현되어 있지 않다.
