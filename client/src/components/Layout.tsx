import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth, type Role } from "../auth";
import { NotificationBell } from "./NotificationBell";

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
  /** Emoji glyph for the mobile bottom nav (employees only). */
  glyph?: string;
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", glyph: "🏠", roles: ["employee", "store_manager", "district_manager", "admin"] },
  { to: "/shops", label: "Shops", glyph: "📋", roles: ["employee", "store_manager", "district_manager", "admin"] },
  { to: "/shops/new", label: "Enter Shop", roles: ["store_manager", "district_manager", "admin"] },
  { to: "/action-plans", label: "Plans", glyph: "✓", roles: ["employee", "store_manager", "district_manager", "admin"] },
  { to: "/appeals", label: "Appeals", roles: ["employee", "store_manager", "district_manager", "admin"] },
  { to: "/recognition", label: "Recognition", glyph: "🏅", roles: ["employee", "store_manager", "district_manager", "admin"] },
  { to: "/training", label: "Training", glyph: "🎓", roles: ["employee", "store_manager", "district_manager", "admin"] },
  { to: "/heatmap", label: "Heatmap", roles: ["store_manager", "district_manager", "admin"] },
  { to: "/admin", label: "Admin", roles: ["admin"] },
  { to: "/admin/rubrics", label: "Rubrics", roles: ["admin"] },
  { to: "/admin/users", label: "Users", roles: ["admin"] },
  { to: "/admin/import", label: "Import", roles: ["admin"] },
  { to: "/admin/gamification", label: "Game", roles: ["admin"] },
  { to: "/admin/training", label: "Modules", roles: ["admin"] },
  { to: "/admin/calibration", label: "Calibration", roles: ["admin", "district_manager"] },
  { to: "/admin/audit-log", label: "Audit", roles: ["admin"] },
  { to: "/admin/config", label: "Config", roles: ["admin"] },
];

// §7: mobile-first for employees. Bottom nav only renders on small viewports
// for the employee role; manager/admin keep the desktop top nav (their
// workflows are desktop-first per spec).
const MOBILE_NAV_FOR_EMPLOYEE = ["/", "/shops", "/recognition", "/training"];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const items = NAV.filter((n) => n.roles.includes(user.role));
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-stine-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <Link to="/" className="font-semibold tracking-tight">
            Stine · Mystery Shop
          </Link>
          <nav className="flex gap-1 flex-1 flex-wrap">
            {items.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm ${isActive ? "bg-stine-600" : "hover:bg-stine-600/60"}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="text-sm flex items-center gap-3">
            <NotificationBell />
            <Link to="/settings" className="hidden sm:inline opacity-90 hover:underline">
              {user.fullName} <span className="opacity-70">({user.role})</span>
            </Link>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="px-2 py-1 rounded bg-stine-600 hover:bg-stine-500 text-xs"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className={`flex-1 max-w-7xl mx-auto w-full px-4 py-6 ${user.role === "employee" ? "pb-24 sm:pb-6" : ""}`}>
        <Outlet />
      </main>

      {user.role === "employee" && (
        <nav
          className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] z-30"
          aria-label="Bottom navigation"
        >
          <ul className="grid grid-cols-4">
            {NAV.filter((n) => MOBILE_NAV_FOR_EMPLOYEE.includes(n.to) && n.roles.includes(user.role)).map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.to === "/"}
                  className={({ isActive }) =>
                    `flex flex-col items-center py-2 text-xs ${
                      isActive ? "text-stine-700" : "text-slate-500"
                    }`
                  }
                >
                  <span className="text-xl leading-none" aria-hidden>{n.glyph}</span>
                  <span className="mt-0.5">{n.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
