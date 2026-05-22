import type { Metadata } from "next";
import { ContractDocumentHub } from "@/components/firebase-contract/ContractDocumentHub";

export const metadata: Metadata = {
  title: "Blocker Gate Hub",
};

export default function FirebaseContractBlockersPage() {
  return <ContractDocumentHub slug="blockers" />;
}
