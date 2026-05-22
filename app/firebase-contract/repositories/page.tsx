import type { Metadata } from "next";
import { ContractDocumentHub } from "@/components/firebase-contract/ContractDocumentHub";

export const metadata: Metadata = {
  title: "Repository and Adapter Hub",
};

export default function FirebaseContractRepositoriesPage() {
  return <ContractDocumentHub slug="repositories" />;
}
