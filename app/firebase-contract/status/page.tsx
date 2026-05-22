import type { Metadata } from "next";
import { StatusDashboard } from "@/components/firebase-contract/StatusDashboard";

export const metadata: Metadata = {
  title: "Firebase Contract Status",
  description: "Mock/test beta status dashboard for the firebase-contract worktree.",
};

export default function FirebaseContractStatusPage() {
  return <StatusDashboard />;
}
