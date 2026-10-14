"use client";

import { WorkspaceContext, useWorkspaceState } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  const workspace = useWorkspaceState();
  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>;
}
