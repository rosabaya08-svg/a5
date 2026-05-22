import type { Metadata } from "next";
import { StatusDashboard } from "@/components/firebase-contract/StatusDashboard";

export const metadata: Metadata = {
  title: "Firebase Contract Preview Hub",
  description: "Mock/test beta preview hub for Firebase contract documents.",
};

export default function FirebaseContractPreviewHubPage() {
  return <StatusDashboard />;
}
