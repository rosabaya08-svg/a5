# Commit candidate

Do not run during unattended mode. Suggested final command for the next working day after manual review:

```powershell
git add app/mock-ui components/ui data types reports/my-app
git commit -m "feat: add mock closed mall preview and readiness screens"
```

Manual checks before committing:

```powershell
git status
npm run lint
npm run build
```
