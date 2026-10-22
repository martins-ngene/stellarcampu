import { Suspense } from "react";
import { LiveVerifyScreen } from "@/components/auth/screens";
import { PortalLoading } from "@/components/portal/ui";
export default function Page() {
  return (
    <Suspense fallback={<PortalLoading />}>
      <LiveVerifyScreen />
    </Suspense>
  );
}
