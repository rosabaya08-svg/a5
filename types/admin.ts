export type AdminApprovalStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "needs_fix"
  | "blocked";

export type CompanyApprovalItem = {
  id: string;
  companyName: string;
  managerName: string;
  businessRegistrationNumber: string;
  mailOrderRegistrationNumber: string;
  submittedAt: string;
  status: AdminApprovalStatus;
  documents: string[];
  riskFlags: string[];
  repositoryPath: string;
};

export type RepositoryConnectionItem = {
  id: string;
  label: string;
  firestoreCollection: string;
  currentMode: "repository_ready" | "server_write_only" | "blocked";
  writePolicy: "SUPER_ADMIN_required" | "Functions_only" | "read_only" | "blocked";
  note: string;
};
