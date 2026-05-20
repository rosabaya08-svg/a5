import type { ManualChecklistItem, MergeTrackItem, ReleaseReadinessItem } from "@/types/mockQaView";

export const mergeTrackItems: MergeTrackItem[] = [
  {
    id: "merge-firebase-contract",
    track: "firebase-contract",
    folder: "my-app-firebase-contract",
    allowedPaths: ["FIREBASE_*.md", "FIRESTORE_SCHEMA_PLAN.md", "AUTH_CLAIMS_PLAN.md", "reports/firebase-contract/**"],
    mergeOrder: 1,
    state: "ready_for_review",
    notes: "Docs-only changes should be reviewed before UI merge.",
    riskStatuses: ["needs_review"],
  },
  {
    id: "merge-qa",
    track: "qa",
    folder: "my-app-qa",
    allowedPaths: ["QA_CHECKLIST.md", "ROUTE_SMOKE_CHECKLIST.md", "MERGE_PLAN.md", "reports/qa/**"],
    mergeOrder: 2,
    state: "waiting",
    notes: "Should follow Firebase contract docs to align smoke routes and blockers.",
    riskStatuses: ["mock_only"],
  },
  {
    id: "merge-admin",
    track: "admin",
    folder: "my-app-admin",
    allowedPaths: ["app/admin/**", "components/admin/**", "components/pages/adminPages.tsx", "reports/admin/**"],
    mergeOrder: 3,
    state: "conflict_risk",
    notes: "May touch shared UI components. Review overlap before merge.",
    riskStatuses: ["needs_review"],
  },
  {
    id: "merge-tablet-qr",
    track: "tablet-qr",
    folder: "my-app-tablet-qr",
    allowedPaths: ["app/tablet/**", "app/q/**", "app/orders/guest/**", "components/pages/*", "data/mock*.ts"],
    mergeOrder: 6,
    state: "conflict_risk",
    notes: "Highest conflict risk because it can touch mock data and repository-facing pages.",
    riskStatuses: ["needs_review", "mock_only"],
  },
];

export const manualChecklistItems: ManualChecklistItem[] = [
  {
    id: "manual-git-status",
    title: "Check local changes",
    commandOrRoute: "git status",
    reason: "Confirm unattended file changes before staging.",
    state: "manual_only",
    riskStatuses: ["needs_review"],
  },
  {
    id: "manual-pull-main",
    title: "Refresh main baseline",
    commandOrRoute: "git pull origin main",
    reason: "Run manually before evaluating worktree merges.",
    state: "manual_only",
    riskStatuses: ["needs_review"],
  },
  {
    id: "manual-lint",
    title: "Run lint",
    commandOrRoute: "npm run lint",
    reason: "Forbidden in unattended mode. Must be run manually later.",
    state: "blocked",
    riskStatuses: ["blocked"],
  },
  {
    id: "manual-build",
    title: "Run build",
    commandOrRoute: "npm run build",
    reason: "Forbidden in unattended mode. Must be run manually later.",
    state: "blocked",
    riskStatuses: ["blocked"],
  },
  {
    id: "manual-route-preview",
    title: "Smoke preview routes",
    commandOrRoute: "/mock-ui, /mock-ui/detail, /mock-ui/checkout, /mock-ui/operations",
    reason: "Confirm static mock preview screens render after dev server is started manually.",
    state: "todo",
    riskStatuses: ["mock_only"],
  },
];

export const releaseReadinessItems: ReleaseReadinessItem[] = [
  {
    id: "release-firebase",
    area: "Firebase",
    requirement: "Repository contract, rules design, Auth claims, and seed plan are approved.",
    currentState: "Docs and stubs only. No SDK import.",
    requiredBeforeLive: "Separate approval for config, rules files, SDK import, and emulator or dev project.",
    riskStatuses: ["blocked", "integration_pending"],
  },
  {
    id: "release-payment",
    area: "Payment",
    requirement: "PG test keys, official docs, refund policy, and settlement policy are approved.",
    currentState: "Mock adapter and UI preview only.",
    requiredBeforeLive: "Server-side amount recalculation, PG adapter, webhook verification, and audit logs.",
    riskStatuses: ["blocked", "payment_failed"],
  },
  {
    id: "release-storage",
    area: "Storage",
    requirement: "Blaze upgrade and Storage rules are approved.",
    currentState: "Spark plan blocks Storage. Placeholder media only.",
    requiredBeforeLive: "Separate approval before product image upload.",
    riskStatuses: ["blocked", "integration_pending"],
  },
  {
    id: "release-qa",
    area: "QA",
    requirement: "Lint, build, smoke routes, and merge review pass.",
    currentState: "Deferred by unattended mode restrictions.",
    requiredBeforeLive: "Manual verification after worktree merge review.",
    riskStatuses: ["needs_review"],
  },
];

