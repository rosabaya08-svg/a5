import type { Metadata } from "next";
import { ContractDocumentHub } from "@/components/firebase-contract/ContractDocumentHub";

export const metadata: Metadata = {
  title: "Auth Claims Hub",
};

export default function FirebaseContractAuthClaimsPage() {
  return <ContractDocumentHub slug="auth-claims" />;
}
