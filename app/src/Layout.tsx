import { NavLink, Outlet } from "react-router-dom";
import { useStore } from "./store";

export default function Layout() {
  const { users, currentUserId, setCurrentUserId, currentUser } = useStore();

  const navByRole: Record<string, { to: string; label: string }[]> = {
    employee: [
      { to: "/", label: "My Dashboard" },
      { to: "/shops", label: "My Shops" },
      { to: "/action-plans", label: "Action Plans" },
    ],
    store_manager: [
      { to: "/", label: "Store Dashboard" },
      { to: "/shops", label: "Shops" },
      { to: "/shops/new", label: "Enter Shop" },
      { to: "/action-plans", label: "Action Plans" },
      { to: "/appeals", label: "Appeals" },
    ],
    district_manager: [
      { to: "/", label: "District Dashboard" },
      { to: "/shops", label: "Shops" },
      { to: "/action-plans", label: "Action Plans" },
      { to: "/appeals", label: "Appeals" },
    ],
    admin: [
      { to: "/", label: "Company Dashboard" },
      { to: "/shops", label: "Shops" },
      { to: "/shops/new", label: "Enter Shop" },
      { to: "/action-plans", label: "Action Plans" },
      { to: "/appeals", label: "Appeals" },
      { to: "/admin/rubrics", label: "Rubrics" },
      { to: "/admin/users", label: "Users" },
    ],
  };

  const items = navByRole[currentUser.role];

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          STINE<span className="accent"> · </span>Mystery Shop
        </div>
        <span className="who">Phase 1 demo · in-memory data</span>
        <div className="spacer" />
        <span className="who">Acting as</span>
        <select
          className="role-switcher"
          value={currentUserId}
          onChange={(e) => setCurrentUserId(e.target.value)}
        >
          {users
            .filter((u) => u.active)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} — {u.role.replace("_", " ")}
              </option>
            ))}
        </select>
      </header>

      <nav className="sidebar">
        <div className="nav-section">Navigation</div>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              "nav-item" + (isActive ? " active" : "")
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
