# Commit candidate

Do not run during unattended mode. Suggested final command for the next working day after manual review:

```powershell
git add app/page.tsx app/mock-ui components/ui components/my-app data types reports/my-app
git commit -m "feat: add mock closed mall preview and readiness screens"
```

Manual checks before committing:

```powershell
git status
npm run lint
npm run build
```
# 2026-05-22 storefront/admin UX commit candidate

```powershell
git add app components data types AUTO_REPORT.md NEXT_TASKS.md reports/my-app
git commit -m "feat: upgrade mock storefront and content admin UX"
```

Do not run this until a human reviews the changed files, lint/build results, and live-integration blockers.
