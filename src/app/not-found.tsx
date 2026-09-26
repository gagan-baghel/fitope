import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="gutter-x mx-auto grid min-h-dvh max-w-sm place-content-center gap-3 text-center">
      <Logo size={56} className="mx-auto" />
      <h1 className="text-[20px] font-bold tracking-tight">This page doesn&apos;t exist</h1>
      <p className="text-[13px] leading-snug text-muted">The link may be old or mistyped.</p>
      <Link href="/" className="mx-auto inline-flex h-14 items-center rounded-2xl bg-accent px-6 text-[15px] font-semibold text-accent-ink">
        Open FitOpe
      </Link>
    </main>
  );
}
