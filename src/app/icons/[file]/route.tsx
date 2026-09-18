import { appIcon } from "@/lib/app-icon";

/** PWA icon set referenced by the manifest. Rendered once at build time. */
const FILES: Record<string, { size: number; maskable?: boolean }> = {
  "192.png": { size: 192 },
  "512.png": { size: 512 },
  "maskable-512.png": { size: 512, maskable: true },
};

export const dynamic = "force-static";
export const generateStaticParams = () => Object.keys(FILES).map((file) => ({ file }));

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const spec = FILES[(await params).file];
  if (!spec) return new Response("Not found", { status: 404 });
  return appIcon(spec.size, { maskable: spec.maskable });
}
