import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { formatRelative } from "../format";

interface Notification {
  id: string;
  shopId: string;
  title: string;
  detail: string;
  when: string;
  unread: boolean;
}

export function NotificationBell() {
  const { currentUser, shops, reviews, actionPlans, appeals, getShop, getLocation, getUser } =
    useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const navigate = useNavigate();

  const items: Notification[] = useMemo(() => {
    const out: Notification[] = [];
    if (currentUser.role === "store_manager") {
      for (const s of shops) {
        if (s.locationId !== currentUser.primaryLocationId) continue;
        if (s.status === "submitted") {
          out.push({
            id: `n-sub-${s.id}`,
            shopId: s.id,
            title: "Shop submitted — needs your review",
            detail: `${getLocation(s.locationId)?.name} · ${s.shopperName} · ${s.percentage}%`,
            when: s.createdAt,
            unread: true,
          });
        }
        if (s.status === "appealed") {
          out.push({
            id: `n-apl-${s.id}`,
            shopId: s.id,
            title: "Appeal filed",
            detail: `${getUser(s.evaluatedEmployeeId ?? "")?.fullName ?? "Employee"} disputes this shop`,
            when: appeals.find((a) => a.shopId === s.id)?.filedAt ?? s.shopDate,
            unread: true,
          });
        }
      }
    } else if (currentUser.role === "employee") {
      for (const s of shops) {
        if (s.evaluatedEmployeeId !== currentUser.id) continue;
        const review = reviews.find((r) => r.shopId === s.id);
        if (review?.status === "completed" && review.reviewedAt) {
          out.push({
            id: `n-rev-${s.id}`,
            shopId: s.id,
            title: "Review completed",
            detail: `${getLocation(s.locationId)?.name} · ${s.percentage}%`,
            when: review.reviewedAt,
            unread: true,
          });
        }
      }
      for (const p of actionPlans) {
        if (p.assignedTo !== currentUser.id) continue;
        if (p.status === "open") {
          out.push({
            id: `n-ap-${p.id}`,
            shopId: p.shopId,
            title: "Action plan assigned",
            detail: `${p.category} · due ${formatRelative(p.dueDate)}`,
            when: p.dueDate,
            unread: true,
          });
        }
      }
    }
    return out
      .sort((a, b) => b.when.localeCompare(a.when))
      .slice(0, 8);
  }, [currentUser, shops, reviews, actionPlans, appeals, getLocation, getUser]);

  const unread = items.filter((i) => i.unread).length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "rgba(255,255,255,0.08)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 6,
          padding: "6px 10px",
          position: "relative",
          fontSize: 13,
        }}
      >
        Inbox
        {unread > 0 && (
          <span
            style={{
              marginLeft: 6,
              background: "#f1a13c",
              color: "#1a1f2b",
              padding: "1px 6px",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 360,
            background: "var(--c-surface)",
            color: "var(--c-text)",
            border: "1px solid var(--c-border)",
            borderRadius: 8,
            boxShadow: "var(--shadow-md)",
            zIndex: 50,
            maxHeight: 420,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--c-border)",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            Inbox
          </div>
          {items.length === 0 ? (
            <div className="empty">All caught up.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {items.map((n) => {
                const shop = getShop(n.shopId);
                return (
                  <li
                    key={n.id}
                    style={{
                      padding: "10px 14px",
                      borderBottom: "1px solid var(--c-border)",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setOpen(false);
                      navigate(`/shops/${n.shopId}`);
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{n.title}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {n.detail}
                    </div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                      {formatRelative(n.when)}
                      {shop && ` · shop ${shop.id}`}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
