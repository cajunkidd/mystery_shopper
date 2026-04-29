import { useEffect, useRef, useState } from "react";
import { api } from "../api";

interface Comment {
  id: string;
  body: string;
  audioTimestampSeconds: number | null;
  author: { fullName: string };
  createdAt: string;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioReview({
  shopId,
  attachmentId,
  comments: initialComments,
  canComment,
  onChange,
}: {
  shopId: string;
  attachmentId: string;
  comments: Comment[];
  canComment: boolean;
  onChange?: () => void;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [t, setT] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pendingTime, setPendingTime] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    const token = localStorage.getItem("token");
    fetch(`/api/v1/attachments/${attachmentId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 403) setAudioError("Audio is not yet released by the manager.");
          else setAudioError(`Audio unavailable (${r.status}).`);
          return;
        }
        const blob = await r.blob();
        revoke = URL.createObjectURL(blob);
        setAudioUrl(revoke);
      })
      .catch(() => setAudioError("Audio failed to load."));
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [attachmentId]);

  async function postComment(timestamp: number | null) {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await api(`/shops/${shopId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          body: draft,
          audioTimestampSeconds: timestamp ?? undefined,
        }),
      });
      setDraft("");
      setPendingTime(null);
      onChange?.();
    } finally {
      setBusy(false);
    }
  }

  if (audioError) {
    return <div className="text-sm text-amber-700">{audioError}</div>;
  }
  if (!audioUrl) return <div className="text-sm text-slate-500">Loading audio…</div>;

  const sortedComments = [...initialComments]
    .filter((c) => c.audioTimestampSeconds != null)
    .sort((a, b) => (a.audioTimestampSeconds ?? 0) - (b.audioTimestampSeconds ?? 0));

  return (
    <div className="space-y-3">
      <audio
        ref={ref}
        src={audioUrl}
        controls
        className="w-full"
        onTimeUpdate={(e) => setT((e.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
      />

      <div className="relative h-3 bg-slate-100 rounded">
        {sortedComments.map((c) => {
          const pct = duration ? ((c.audioTimestampSeconds ?? 0) / duration) * 100 : 0;
          return (
            <button
              key={c.id}
              title={`${fmt(c.audioTimestampSeconds ?? 0)} — ${c.body}`}
              onClick={() => {
                if (ref.current) ref.current.currentTime = c.audioTimestampSeconds ?? 0;
              }}
              className="absolute -top-1 w-3 h-5 bg-stine-500 rounded-sm hover:bg-stine-600"
              style={{ left: `${pct}%` }}
            />
          );
        })}
      </div>

      {canComment && (
        <div className="card border-stine-100 border-2 space-y-2">
          <div className="text-sm font-medium">
            Add comment {pendingTime != null ? `at ${fmt(pendingTime)}` : "(no timestamp)"}
          </div>
          <textarea
            className="input"
            rows={2}
            placeholder="Comment"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary text-xs" onClick={() => setPendingTime(t)}>
              Anchor at current time ({fmt(t)})
            </button>
            <button
              className="btn-primary text-xs"
              disabled={busy || !draft.trim()}
              onClick={() => postComment(pendingTime)}
            >
              Post
            </button>
            {pendingTime != null && (
              <button className="btn-secondary text-xs" onClick={() => setPendingTime(null)}>
                Clear timestamp
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="font-medium text-sm mb-1">Time-anchored comments</div>
        {sortedComments.length === 0 && <p className="text-xs text-slate-400">No comments yet.</p>}
        <ul className="space-y-1">
          {sortedComments.map((c) => (
            <li key={c.id} className="text-sm">
              <button
                onClick={() => {
                  if (ref.current) ref.current.currentTime = c.audioTimestampSeconds ?? 0;
                }}
                className="font-mono text-stine-600 hover:underline mr-2"
              >
                [{fmt(c.audioTimestampSeconds ?? 0)}]
              </button>
              <span>{c.body}</span>
              <span className="text-xs text-slate-400 ml-1">— {c.author.fullName}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AudioUpload({ shopId, onUploaded }: { shopId: string; onUploaded: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("role", "audio");
      const token = localStorage.getItem("token");
      const r = await fetch(`/api/v1/shops/${shopId}/attachments`, {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) throw new Error(`Upload failed (${r.status})`);
      onUploaded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <input
        className="input"
        type="file"
        accept="audio/*"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />
      {error && <p className="text-rose-600 text-xs">{error}</p>}
      {busy && <p className="text-slate-500 text-xs">Uploading…</p>}
    </div>
  );
}
