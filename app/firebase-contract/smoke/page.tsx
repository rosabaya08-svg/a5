import type { Metadata } from "next";
import { ContractDocumentHub } from "@/components/firebase-contract/ContractDocumentHub";

export const metadata: Metadata = {
  title: "Firebase Contract Visual Smoke",
};

export default function FirebaseContractSmokePage() {
  return <ContractDocumentHub slug="smoke" />;
}
