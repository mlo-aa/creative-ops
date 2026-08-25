"use client";

import { StudioProvider } from "@/core/store";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <StudioProvider>{children}</StudioProvider>;
}
