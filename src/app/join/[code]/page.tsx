"use client";

import { useConvexAuth } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { normalizeCode } from "../../../../convex/lib/family";

/**
 * Invite links land here. Signed in → straight to the join sheet. Signed out → the code is
 * parked in localStorage and picked up by the app shell after sign-up and onboarding.
 */
export default function Join() {
  const { code } = useParams<{ code: string }>();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const c = normalizeCode(code ?? "");
    if (isAuthenticated) return router.replace(`/family?join=${c}`);
    try {
      localStorage.setItem("fitope-join", c);
    } catch {}
    router.replace("/welcome");
  }, [code, isAuthenticated, isLoading, router]);

  return <div className="grid min-h-dvh place-items-center text-[64px]">👨‍👩‍👧‍👦</div>;
}
