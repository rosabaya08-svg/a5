import { Suspense } from "react";
import { SuperAdminGoogleLogin } from "@/components/auth/SuperAdminGoogleLogin";

export default function Page() {
  return (
    <Suspense>
      <SuperAdminGoogleLogin />
    </Suspense>
  );
}
