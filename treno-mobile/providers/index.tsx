// providers/index.tsx
// Wraps the app with all providers.
// For now it's just AuthProvider. We'll add more as needed.

import React from "react";
import { AuthProvider } from "./AuthProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
