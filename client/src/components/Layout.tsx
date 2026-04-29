import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth, type Role } from "../auth";
import { NotificationBell } from "./NotificationBell";

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", roles: ["employee", "store_manager", "district_manager", "admin"] },
  { to: "/shops", label: "Shops", roles: ["employee", "store_manager", "district_manager", "admin"] },
  { to: "/shops/new", label: "Enter Shop", roles: ["store_manager", "district_manager", "admin"] },
  { to: "/action-plans", label: "Action Plans", roles: ["employee", "store_manager", "district_manager", "admin"] },
  { to: "/appeals", label: "Appeals", roles: ["employee", "store_manager", "district_manager", "admin"] },
  { to: "/recognition", label: "Recognition", roles: ["employee", "store_manager", "district_manager", "admin"] },
  { to: "/training", label: "Training", roles: ["employee", "store_manager", "district_manager", "admin"] },
  { to: "/heatmap", label: "Heatmap", roles: ["store_manager", "district_manager", "admin"] },
  { to: "/admin/rubrics", label: "Rubrics", roles: ["admin"] },
  { to: "/admin/users", label: "Users", roles: ["admin"] },
  { to: "/admin/import", label: "Import", roles: ["admin"] },
  { to: "/admin/gamification", label: "Game", roles: ["admin"] },
  { to: "/admin/training", label: "Modules", roles: ["admin"] },
  { to: "/admin/calibration", label: "Calibration", roles: ["admin", "district_manager"] },
  { to: "/admin/audit-log", label: "Audit", roles: ["admin"] },
  { to: "/admin/config", label: "Config", roles: ["admin"] },
];

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
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
