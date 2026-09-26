"use client";

import { useEffect } from "react";
import { Button, Logo } from "@/components/ui";

/**
 * Any render error below the root layout lands here instead of a blank page. It reloads rather
 * than calling `retry()`: a failed Convex query keeps its error until the client reconnects.
 */
export default function ErrorScreen({ error }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="gutter-x mx-auto grid min-h-dvh max-w-sm place-content-center gap-3 text-center">
      <Logo size={56} className="mx-auto" />
      <h1 className="text-[20px] font-bold tracking-tight">Something went wrong</h1>
      <p className="text-[13px] leading-snug text-muted">Usually a patchy connection. Everything you saved is safe.</p>
      <Button size="lg" onClick={() => location.reload()}>Try again</Button>
      <Button variant="ghost" onClick={() => location.assign("/")}>Go to Home</Button>
    </main>
  );
}
