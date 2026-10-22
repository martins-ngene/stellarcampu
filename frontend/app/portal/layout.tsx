import { Suspense, type ReactNode } from "react";
import { PortalLoading } from "@/components/portal/ui";
export default function Layout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PortalLoading />}>{children}</Suspense>;
}
