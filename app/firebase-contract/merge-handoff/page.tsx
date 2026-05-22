import type { Metadata } from "next";
import { ContractDocumentHub } from "@/components/firebase-contract/ContractDocumentHub";

export const metadata: Metadata = {
  title: "Firebase Contract Merge Handoff",
};

export default function FirebaseContractMergeHandoffPage() {
  return <ContractDocumentHub slug="merge-handoff" />;
}
