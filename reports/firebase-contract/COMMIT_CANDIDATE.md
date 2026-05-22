# Firebase Contract Commit Candidate

## 후보 명령

```powershell
git add FIRESTORE_SCHEMA_PLAN.md AUTH_CLAIMS_PLAN.md FUNCTIONS_SERVER_LOGIC_PLAN.md FIREBASE_SEED_DATA_PLAN.md REPOSITORY_INTERFACE_PLAN.md ADAPTER_SPLIT_PLAN.md FIREBASE_BLOCKERS.md reports/firebase-contract
git add app/firebase-contract/status components/firebase-contract data/firebase-contract
git add app/firebase-contract
git commit -m "docs: add firebase contract preview hub"
```

## 포함 범위

- Firebase 실제 연결 전 schema/claims/functions/rules/seed/adapter 계약 문서
- reports/firebase-contract 하위 보고서
- 무인 진행 기록과 커밋 후보 기록
- 로컬 상태 대시보드 route, component, mock status data
- preview hub routes and visual smoke reports

## 제외/금지

- git 명령 실행 안 함
- Firebase 설정 파일 생성 안 함
- Rules 파일 생성 안 함
- Secret/service account/private key 생성 안 함
- 실제 외부 API 연결 안 함
