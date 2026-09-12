"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Card, ConfirmButton, EmptyState, Pill, SectionTitle, Segmented, Sheet, Skeleton, useToast } from "@/components/ui";
import { ArrowLeft, Camera, Lock, Trash2, Upload } from "lucide-react";
import { prettyDate, todayStr } from "@/lib/utils";

const POSES = [
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
  { value: "back", label: "Back" },
];

export default function Photos() {
  const photos = useQuery(api.tracking.listPhotos, {});
  const generateUrl = useMutation(api.tracking.generateUploadUrl);
  const savePhoto = useMutation(api.tracking.savePhoto);
  const deletePhoto = useMutation(api.tracking.deletePhoto);
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pose, setPose] = useState("front");
  const [uploading, setUploading] = useState(false);
  const [compare, setCompare] = useState<any>(null);

  const byPose = (photos ?? []).filter((p: any) => p.pose === pose);
  const oldest = byPose[byPose.length - 1];
  const newest = byPose[0];

  async function upload(file: File) {
    if (file.size > 12 * 1024 * 1024) {
      toast({ message: "Image is over 12 MB — try a smaller one", tone: "var(--rose)" });
      return;
    }
    setUploading(true);
    try {
      const url = await generateUrl();
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await res.json();
      await savePhoto({ storageId, pose, date: todayStr() });
      toast({ message: "Photo saved privately to your account" });
    } catch (e: any) {
      toast({ message: "Upload failed", tone: "var(--rose)" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pt-1">
        <button onClick={() => router.push("/progress")} className="rounded-xl p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-[22px] font-bold tracking-tight">Progress photos</h1>
      </header>

      <Card className="flex items-start gap-3 bg-surface-2 py-3.5">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
        <p className="text-[12.5px] leading-relaxed text-muted">
          Photos are stored against your account only. Nobody else can see them, they are never used
          for anything else, and deleting one removes the file for good.
        </p>
      </Card>

      <Segmented value={pose} onChange={setPose} options={POSES} />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <Button className="w-full" size="lg" loading={uploading} onClick={() => fileRef.current?.click()}>
        <Upload className="h-4 w-4" /> Add {pose} photo
      </Button>

      {photos === undefined ? (
        <Skeleton className="h-64 w-full" />
      ) : byPose.length === 0 ? (
        <EmptyState
          icon={<Camera className="h-5 w-5" />}
          title={`No ${pose} photos yet`}
          body="Same spot, same light, same time of day. Monthly is plenty — change shows up over months, not days."
        />
      ) : (
        <>
          {byPose.length > 1 && (
            <Card>
              <SectionTitle>Then and now</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {[oldest, newest].map((p: any, i) => (
                  <figure key={p._id}>
                    <img src={p.url} alt={`${pose} on ${p.date}`} className="aspect-[3/4] w-full rounded-2xl object-cover" />
                    <figcaption className="mt-1.5 text-center text-[12px] text-muted">
                      {i === 0 ? "First" : "Latest"} · {prettyDate(p.date)}
                      {p.weightKg ? ` · ${p.weightKg} kg` : ""}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Card>
          )}

          <SectionTitle>All {pose} photos</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {byPose.map((p: any) => (
              <button key={p._id} onClick={() => setCompare(p)} className="group relative overflow-hidden rounded-2xl">
                <img src={p.url} alt={`${pose} on ${p.date}`} className="aspect-[3/4] w-full object-cover transition-transform group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-left text-[10.5px] font-semibold text-white">
                  {p.date.slice(5)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <Sheet open={!!compare} onClose={() => setCompare(null)} title={compare ? prettyDate(compare.date) : ""}>
        {compare && (
          <div className="space-y-3">
            <img src={compare.url} alt="" className="w-full rounded-2xl" />
            <div className="flex items-center gap-2">
              <Pill tone="violet">{compare.pose}</Pill>
              {compare.weightKg && <Pill>{compare.weightKg} kg</Pill>}
            </div>
            <ConfirmButton
              onConfirm={async () => {
                await deletePhoto({ id: compare._id });
                setCompare(null);
                toast({ message: "Photo deleted" });
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete photo
            </ConfirmButton>
          </div>
        )}
      </Sheet>
    </div>
  );
}
