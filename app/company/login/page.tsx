import { Suspense } from "react";
import { BetaAdminLogin } from "@/components/auth/BetaAdminLogin";

export default function Page() {
  return (
    <Suspense>
      <BetaAdminLogin role="company" />
    </Suspense>
  );
}
