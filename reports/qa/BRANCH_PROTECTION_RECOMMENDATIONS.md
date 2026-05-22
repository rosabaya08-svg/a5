# Branch Protection Recommendations

## Purpose

These settings are recommendations for the repository host after the mock/test beta branches are ready. They are not applied by this unattended task.

## Recommended Rules For `main`

- Require pull request before merge.
- Require at least one approving review.
- Require conversation resolution.
- Require status checks:
  - `Mock Beta CI / lint-and-build`
- Require branches to be up to date before merge if CI capacity allows it.
- Block force pushes.
- Block branch deletion.
- Restrict who can bypass protection.
- Require signed commits only if the team already uses signing.

## Temporary Mock Beta Exceptions

- Allow draft PRs while worktree tracks are still being generated.
- Do not require deployment checks for mock/test beta.
- Do not require production secrets or environment approvals for mock/test beta.

## Merge Queue Considerations

- Use merge queue only after all six tracks have passed conflict review.
- If CI minutes are limited, merge in the documented order and run CI on each combined step.

