import { useState } from "react";
import { useStore } from "../store";
import { formatRelative } from "../format";

interface CommentThreadProps {
  shopId: string;
}

export function CommentThread({ shopId }: CommentThreadProps) {
  const { getCommentsForShop, addComment, getUser, currentUser } = useStore();
  const all = getCommentsForShop(shopId)
    .filter((c) => c.audioTimestampSeconds == null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const [draft, setDraft] = useState("");

  function post() {
    if (!draft.trim()) return;
    addComment({
      id: `cmt-${Math.random().toString(36).slice(2, 8)}`,
      shopId,
      authorId: currentUser.id,
      body: draft.trim(),
      audioTimestampSeconds: null,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setDraft("");
  }

  return (
    <div className="card">
      <h2>Discussion</h2>
      {all.length === 0 ? (
        <div className="empty">No comments yet.</div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
          {all.map((c) => {
            const author = getUser(c.authorId);
            return (
              <li
                key={c.id}
                style={{
                  padding: 10,
                  borderBottom: "1px solid var(--c-border)",
                }}
              >
                <div className="muted" style={{ fontSize: 12 }}>
                  <strong style={{ color: "var(--c-text)" }}>
                    {author?.fullName ?? "Unknown"}
                  </strong>{" "}
                  · {formatRelative(c.createdAt)}
                </div>
                <div style={{ marginTop: 4 }}>{c.body}</div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="row" style={{ alignItems: "flex-end" }}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment..."
          onKeyDown={(e) => {
            if (e.key === "Enter") post();
          }}
        />
        <button
          className="btn primary"
          disabled={!draft.trim()}
          onClick={post}
          style={{ flex: "0 0 auto" }}
        >
          Post
        </button>
      </div>
    </div>
  );
}
