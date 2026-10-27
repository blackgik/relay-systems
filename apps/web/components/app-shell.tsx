import React from 'react';
import { DashboardShell } from './dashboard/shell';

// Every signed-in page shares the dashboard frame (sidebar, role switch,
// notifications). Kept as a named wrapper so existing pages need no changes.
export function AppShell({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
