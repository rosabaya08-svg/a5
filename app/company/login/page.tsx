import { Suspense } from "react";
import { CompanyFirebaseLogin } from "@/components/auth/CompanyFirebaseLogin";

export default function Page() {
  return (
    <Suspense>
      <CompanyFirebaseLogin />
    </Suspense>
  );
}
