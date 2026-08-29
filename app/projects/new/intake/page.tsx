"use client";

import { IntakeWizard } from "@/core/ui/intake/IntakeWizard";
import { Suspense } from "react";

export default function IntakePage() {
  return (
    <Suspense fallback={<p className="opacity-50">Loading intake…</p>}>
      <IntakeWizard />
    </Suspense>
  );
}
