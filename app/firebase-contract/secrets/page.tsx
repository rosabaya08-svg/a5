import type { Metadata } from "next";
import { ContractDocumentHub } from "@/components/firebase-contract/ContractDocumentHub";

export const metadata: Metadata = {
  title: "Secret Manager Plan Hub",
};

export default function FirebaseContractSecretsPage() {
  return <ContractDocumentHub slug="secrets" />;
}
