import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();

  function load() {
    api<{ notifications: Notification[]; unread: number }>("/notifications").then((r) => {
      setItems(r.notifications);
      setUnread(r.unread);
    });
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  async function open_(n: Notification) {
    if (!n.read) {
      await api(`/notifications/${n.id}/read`, { method: "POST", body: JSON.stringify({}) });
    }
    setOpen(false);
    if (n.link) navigate(n.link);
    load();
  }

  async function readAll() {
    await api(`/notifications/read-all`, { method: "POST", body: JSON.stringify({}) });
    load();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative px-2 py-1 rounded hover:bg-stine-600/60"
        aria-label="Notifications"
      >
        <span aria-hidden>🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white text-slate-900 rounded-md shadow-lg border border-slate-200 z-50 max-h-96 overflow-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="font-medium text-sm">Notifications</span>
            <button className="text-xs text-stine-600 hover:underline" onClick={readAll}>
              Mark all read
            </button>
          </div>
          {items.length === 0 && <p className="px-3 py-4 text-sm text-slate-400">All clear.</p>}
          <ul>
            {items.map((n) => (
              <li
                key={n.id}
                className={`px-3 py-2 border-b last:border-0 cursor-pointer hover:bg-slate-50 ${n.read ? "" : "bg-stine-50"}`}
                onClick={() => open_(n)}
              >
                <div className="text-sm font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-slate-500">{n.body}</div>}
                <div className="text-xs text-slate-400 mt-0.5">{new Date(n.createdAt).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
