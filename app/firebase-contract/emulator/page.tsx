import type { Metadata } from "next";
import { ContractDocumentHub } from "@/components/firebase-contract/ContractDocumentHub";

export const metadata: Metadata = {
  title: "Emulator Plan Hub",
};

export default function FirebaseContractEmulatorPage() {
  return <ContractDocumentHub slug="emulator" />;
}
