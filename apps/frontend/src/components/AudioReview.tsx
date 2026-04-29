import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import type { Comment } from "../types";
import { formatRelative } from "../format";

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface AudioReviewProps {
  shopId: string;
  durationSeconds: number;
}

export function AudioReview({ shopId, durationSeconds }: AudioReviewProps) {
  const { getCommentsForShop, addComment, currentUser } = useStore();
  const allComments = getCommentsForShop(shopId);
  const timestamped = useMemo(
    () =>
      [...allComments]
        .filter((c) => c.audioTimestampSeconds != null)
        .sort(
          (a, b) =>
            (a.audioTimestampSeconds ?? 0) - (b.audioTimestampSeconds ?? 0),
        ),
    [allComments],
  );

  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [draft, setDraft] = useState("");
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    tickRef.current = window.setInterval(() => {
      setPosition((p) => {
        if (p >= durationSeconds) {
          setPlaying(false);
          return durationSeconds;
        }
        return p + 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [playing, durationSeconds]);

  function jumpTo(seconds: number) {
    setPosition(Math.max(0, Math.min(seconds, durationSeconds)));
  }

  function postComment() {
    if (!draft.trim()) return;
    addComment({
      id: `cmt-${Math.random().toString(36).slice(2, 8)}`,
      shopId,
      authorId: currentUser.id,
      body: draft.trim(),
      audioTimestampSeconds: Math.floor(position),
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setDraft("");
  }

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Audio review</h2>
        <span className="pill blue">Phase 2 preview</span>
      </div>
      <div className="callout">
        Demo player simulates timeline scrubbing. Click anywhere on the bar to
        anchor a comment to that timestamp.
      </div>

      <div
        style={{
          padding: 12,
          background: "var(--c-surface-2)",
          borderRadius: 8,
        }}
      >
        <div className="flex-between" style={{ marginBottom: 8 }}>
          <button
            className="btn small primary"
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatTimestamp(position)} / {formatTimestamp(durationSeconds)}
          </span>
        </div>
        <Timeline
          duration={durationSeconds}
          position={position}
          comments={timestamped}
          onSeek={jumpTo}
        />
      </div>

      <div style={{ marginTop: 14 }}>
        <label>Add comment at {formatTimestamp(position)}</label>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What should be noted at this moment?"
            onKeyDown={(e) => {
              if (e.key === "Enter") postComment();
            }}
          />
          <button
            className="btn primary"
            onClick={postComment}
            disabled={!draft.trim()}
            style={{ flex: "0 0 auto" }}
          >
            Anchor at {formatTimestamp(position)}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3 style={{ margin: "0 0 8px" }}>Timeline comments</h3>
        {timestamped.length === 0 ? (
          <div className="empty">No timestamped comments yet.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {timestamped.map((c) => (
              <TimestampedComment
                key={c.id}
                comment={c}
                onJump={() => jumpTo(c.audioTimestampSeconds ?? 0)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Timeline({
  duration,
  position,
  comments,
  onSeek,
}: {
  duration: number;
  position: number;
  comments: Comment[];
  onSeek: (s: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(ratio * duration);
  }

  return (
    <div
      ref={ref}
      onClick={handleClick}
      style={{
        position: "relative",
        height: 36,
        background: "#fff",
        border: "1px solid var(--c-border)",
        borderRadius: 6,
        cursor: "pointer",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${(position / duration) * 100}%`,
          background: "rgba(10, 77, 140, 0.12)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `calc(${(position / duration) * 100}% - 1px)`,
          top: 0,
          bottom: 0,
          width: 2,
          background: "var(--c-primary)",
        }}
      />
      {comments.map((c) => {
        const t = c.audioTimestampSeconds ?? 0;
        const left = (t / duration) * 100;
        return (
          <div
            key={c.id}
            title={c.body}
            onClick={(e) => {
              e.stopPropagation();
              onSeek(t);
            }}
            style={{
              position: "absolute",
              left: `calc(${left}% - 6px)`,
              top: 8,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "var(--c-accent)",
              border: "2px solid #fff",
              boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
              cursor: "pointer",
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          right: 8,
          bottom: 4,
          fontSize: 10,
          color: "var(--c-text-faint)",
          pointerEvents: "none",
        }}
      >
        click to seek
      </div>
    </div>
  );
}

function TimestampedComment({
  comment,
  onJump,
}: {
  comment: Comment;
  onJump: () => void;
}) {
  const { getUser } = useStore();
  const author = getUser(comment.authorId);
  return (
    <li
      style={{
        padding: 10,
        border: "1px solid var(--c-border)",
        borderRadius: 6,
        marginBottom: 6,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <button
        className="btn small"
        onClick={onJump}
        style={{
          fontVariantNumeric: "tabular-nums",
          minWidth: 64,
          background: "var(--c-surface-2)",
        }}
      >
        {formatTimestamp(comment.audioTimestampSeconds ?? 0)}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12 }} className="muted">
          {author?.fullName ?? "Unknown"} · {formatRelative(comment.createdAt)}
        </div>
        <div>{comment.body}</div>
      </div>
    </li>
  );
}
