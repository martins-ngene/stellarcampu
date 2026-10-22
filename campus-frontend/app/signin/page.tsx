import { Suspense } from "react";
import { LiveAuthScreen } from "@/components/auth/screens";
import { PortalLoading } from "@/components/portal/ui";
export default function Page() {
  return (
    <Suspense fallback={<PortalLoading />}>
      <LiveAuthScreen />
    </Suspense>
  );
}
