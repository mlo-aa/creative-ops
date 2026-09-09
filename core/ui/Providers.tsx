"use client";

import { AppShell } from "@/core/ui/AppShell";
import { StudioProvider, useStudio } from "@/core/store";
import { MigrationModal } from "@/core/ui/MigrationModal";
import type { ReactNode } from "react";

function AppChrome({ children }: { children: ReactNode }) {
  const { showMigrationPrompt, dismissMigration } = useStudio();
  return (
    <>
      <MigrationModal open={showMigrationPrompt} onClose={() => dismissMigration()} />
      <AppShell>{children}</AppShell>
    </>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StudioProvider>
      <AppChrome>{children}</AppChrome>
    </StudioProvider>
  );
}
