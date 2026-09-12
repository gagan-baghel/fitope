"use client";

import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Dumbbell } from "lucide-react";

/** Single gate: signed out -> marketing/sign-in, onboarding incomplete -> onboarding, else home. */
export default function Gate() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.profiles.me, isAuthenticated ? {} : "skip");
  const ensureLibrary = useMutation(api.seed.ensureLibrary);
  const router = useRouter();
  const seeded = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !seeded.current) {
      seeded.current = true;
      ensureLibrary().catch(() => {});
    }
  }, [isAuthenticated, ensureLibrary]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace("/welcome");
    else if (me !== undefined) router.replace(me?.profile?.onboardingComplete ? "/home" : "/onboarding");
  }, [isLoading, isAuthenticated, me, router]);

  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex animate-pop flex-col items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-accent text-accent-ink">
          <Dumbbell className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <div className="text-sm text-muted">Loading your day…</div>
      </div>
    </div>
  );
}
