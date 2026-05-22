import type { Metadata } from "next";
import { ContractDocumentHub } from "@/components/firebase-contract/ContractDocumentHub";

export const metadata: Metadata = {
  title: "Firestore Schema Hub",
};

export default function FirebaseContractSchemaPage() {
  return <ContractDocumentHub slug="schema" />;
}
