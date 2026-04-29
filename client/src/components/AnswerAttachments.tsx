import { useEffect, useState } from "react";

export interface AnswerAttachment {
  id: string;
  mimeType: string;
  originalName: string;
}

export interface AnswerAttachmentsProps {
  shopId: string;
  answerId: string | undefined;
  attachments: AnswerAttachment[];
  canEdit: boolean;
  onChange: () => void;
}

/**
 * Renders the per-answer attachment row on shop detail: image thumbnails for
 * each existing attachment and an upload control when the viewer can edit.
 *
 * Image blobs are fetched with the JWT (so authorization survives) and turned
 * into object URLs. The cleanup function revokes them on unmount.
 */
export function AnswerAttachments({
  shopId,
  answerId,
  attachments,
  canEdit,
  onChange,
}: AnswerAttachmentsProps) {
  const [busy, setBusy] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const next: Record<string, string> = {};
    const promises = attachments
      .filter((a) => a.mimeType.startsWith("image/"))
      .map(async (a) => {
        const t = localStorage.getItem("token");
        const r = await fetch(`/api/v1/attachments/${a.id}/file`, {
          headers: t ? { Authorization: `Bearer ${t}` } : {},
        });
        if (r.ok) {
          const blob = await r.blob();
          if (!cancelled) next[a.id] = URL.createObjectURL(blob);
        }
      });
    Promise.all(promises).then(() => {
      if (!cancelled) setThumbs(next);
    });
    return () => {
      cancelled = true;
      Object.values(next).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [attachments]);

  async function upload(file: File) {
    if (!answerId) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("shopAnswerId", answerId);
      const t = localStorage.getItem("token");
      await fetch(`/api/v1/shops/${shopId}/attachments`, {
        method: "POST",
        body: fd,
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      onChange();
    } finally {
      setBusy(false);
    }
  }

  if (attachments.length === 0 && !canEdit) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2 items-center">
      {attachments.map((a) => (
        <a
          key={a.id}
          href={thumbs[a.id]}
          target="_blank"
          rel="noreferrer"
          className="block border border-slate-200 rounded p-1 text-xs"
          title={a.originalName}
        >
          {a.mimeType.startsWith("image/") && thumbs[a.id] ? (
            <img src={thumbs[a.id]} alt={a.originalName} className="h-12 w-12 object-cover rounded" />
          ) : (
            <span className="text-slate-500">{a.originalName.slice(0, 16)}</span>
          )}
        </a>
      ))}
      {canEdit && answerId && (
        <label className="text-xs text-stine-600 hover:underline cursor-pointer">
          {busy ? "Uploading…" : "+ Add photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
        </label>
      )}
    </div>
  );
}
