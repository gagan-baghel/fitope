"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ToastHost } from "@/components/ui";
import { registerServiceWorker } from "@/components/family";
import "@/components/install"; // captures the install prompt as early as possible
import { useEffect } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

export function Providers({ children }: { children: React.ReactNode }) {
  // App-wide so the welcome page is installable and push works before sign-in completes.
  useEffect(registerServiceWorker, []);
  return (
    <ConvexAuthProvider client={convex}>
      <ToastHost>{children}</ToastHost>
    </ConvexAuthProvider>
  );
}
