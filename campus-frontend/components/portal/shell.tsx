"use client";
import { useLiveAuth } from "@/components/auth/provider";
import { LivePortal } from "@/components/auth/portal";
import { PortalLoading } from "./ui";

// Route pages own their content; the parent layout always renders its page segment.
export function PortalPage() {
  const auth = useLiveAuth();
  return auth.ready ? <LivePortal /> : <PortalLoading />;
}
