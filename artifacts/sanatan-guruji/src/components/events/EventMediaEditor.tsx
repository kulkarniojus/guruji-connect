import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, X } from "lucide-react";
import {
  useRequestEventMediaUpload, useCompleteEventMediaUpload,
  type EventMediaItem, type EventMediaUploadInputContentType,
} from "@workspace/api-client-react";
import { errMsg } from "./eventUtils";

const IMG = ["image/jpeg", "image/png", "image/webp"];
const MB = 1024 * 1024;

export default function EventMediaEditor({ media, onChange, onPending }: { media: EventMediaItem[]; onChange: (m: EventMediaItem[]) => void; onPending: (n: boolean) => void }) {
  const reqUpload = useRequestEventMediaUpload();
  const complete = useCompleteEventMediaUpload();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [asBanner, setAsBanner] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const mediaRef = useRef(media);
  mediaRef.current = media;

  const upload = async (file: File) => {
    setError("");
    const isImg = IMG.includes(file.type);
    if (!isImg && file.type !== "video/mp4" && file.type !== "application/pdf") return setError("Only JPG, PNG, WebP, MP4 or PDF files are allowed.");
    if (file.size > (isImg ? 5 : 25) * MB) return setError(isImg ? "Images must be 5 MB or smaller." : "MP4 and PDF files must be 25 MB or smaller.");
    if (media.length >= 12) return setError("An event can have at most 12 media items.");
    if (asBanner && (!isImg || media.some(m => m.kind === "banner"))) return setError(!isImg ? "A banner must be an image." : "Only one banner is allowed. Remove the current one first.");
    setBusy(true); onPending(true);
    try {
      const r = await reqUpload.mutateAsync({ data: { name: file.name, size: file.size, contentType: file.type as EventMediaUploadInputContentType } });
      const put = await fetch(r.uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error("Upload to storage failed.");
      const kind = asBanner ? "banner" : isImg ? "photo" : file.type === "video/mp4" ? "video" : "document";
      const item = await complete.mutateAsync({ data: { url: r.url, kind, label: file.name.replace(/\.[^.]+$/, "").slice(0, 100) } });
      onChange([...mediaRef.current, item]);
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); onPending(false); if (ref.current) ref.current.value = ""; }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={ref} type="file" hidden accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} data-testid="input-media-file" />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()} data-testid="button-upload-media">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Upload
        </Button>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={asBanner} onChange={e => setAsBanner(e.target.checked)} />Use as banner</label>
        <span className="text-xs text-muted-foreground">JPG/PNG/WebP up to 5 MB, MP4/PDF up to 25 MB, max 12.</span>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <ul className="space-y-2">
        {media.map((m, i) => (
          <li key={m.url} className="flex items-center gap-2 rounded border p-2 text-sm">
            <span className="w-16 shrink-0 rounded bg-muted px-2 py-0.5 text-center text-xs">{m.kind}</span>
            <Input value={m.label} onChange={e => onChange(media.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} aria-label="Media label" />
            <Button type="button" size="icon" variant="ghost" aria-label="Remove media" onClick={() => onChange(media.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
