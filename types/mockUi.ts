import type { ReactNode } from "react";

export type MockUiTone = "neutral" | "info" | "success" | "warning" | "danger";

export type MockUiStateKind =
  | "empty"
  | "error"
  | "blocked"
  | "expired"
  | "pending"
  | "ready";

export type RiskStatus =
  | "needs_review"
  | "blocked"
  | "expired"
  | "payment_failed"
  | "settlement_hold"
  | "inventory_low"
  | "integration_pending"
  | "mock_only";

export type MockAction = {
  label: string;
  href?: string;
  description?: string;
};

export type MockUiState = {
  id: string;
  kind: MockUiStateKind;
  title: string;
  description: string;
  tone?: MockUiTone;
  action?: MockAction;
};

export type FilterOption = {
  label: string;
  value: string;
  count?: number;
};

export type FilterGroup = {
  id: string;
  label: string;
  options: FilterOption[];
};

export type SortOption = {
  label: string;
  value: string;
  description?: string;
};

export type DetailField = {
  label: string;
  value: ReactNode;
  helper?: string;
};

export type DetailSection = {
  id: string;
  title: string;
  description?: string;
  fields: DetailField[];
};

