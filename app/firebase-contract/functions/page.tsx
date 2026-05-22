import type { Metadata } from "next";
import { ContractDocumentHub } from "@/components/firebase-contract/ContractDocumentHub";

export const metadata: Metadata = {
  title: "Functions Server Logic Hub",
};

export default function FirebaseContractFunctionsPage() {
  return <ContractDocumentHub slug="functions" />;
}
