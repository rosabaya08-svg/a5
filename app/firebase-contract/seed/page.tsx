import type { Metadata } from "next";
import { ContractDocumentHub } from "@/components/firebase-contract/ContractDocumentHub";

export const metadata: Metadata = {
  title: "Seed Dry-run Hub",
};

export default function FirebaseContractSeedPage() {
  return <ContractDocumentHub slug="seed" />;
}
