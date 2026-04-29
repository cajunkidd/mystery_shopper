import { NavLink, Outlet } from "react-router-dom";
import { gamificationActiveForLocation, useStore } from "./store";
import { NotificationBell } from "./components/NotificationBell";

export default function Layout() {
  const { users, currentUserId, setCurrentUserId, currentUser, systemConfig } = useStore();

  const gamificationOn = gamificationActiveForLocation(
    systemConfig,
    currentUser.primaryLocationId,
  );

  type Item = { to: string; label: string };
  type Section = { label: string; items: Item[] };

  const sections: Section[] = (() => {
    if (currentUser.role === "employee") {
      const main: Item[] = [
        { to: "/", label: "My Dashboard" },
        { to: "/shops", label: "My Shops" },
        { to: "/action-plans", label: "Action Plans" },
        { to: "/training", label: "Training" },
        { to: "/settings", label: "Settings" },
      ];
      const game: Item[] = gamificationOn ? [{ to: "/me/points", label: "My Points" }] : [];
      return [
        { label: "Workspace", items: main },
        ...(game.length ? [{ label: "Recognition", items: game }] : []),
      ];
    }
    if (currentUser.role === "store_manager") {
      const main: Item[] = [
        { to: "/", label: "Store Dashboard" },
        { to: "/shops", label: "Shops" },
        { to: "/shops/new", label: "Enter Shop" },
        { to: "/action-plans", label: "Action Plans" },
        { to: "/appeals", label: "Appeals" },
        { to: "/digest", label: "Weekly Digest" },
        { to: "/settings", label: "Settings" },
      ];
      const game: Item[] = systemConfig.gamificationEnabled
        ? [
            { to: "/leaderboard", label: "Leagues" },
            { to: "/challenges", label: "Challenges" },
            { to: "/hunt", label: "The Hunt" },
          ]
        : [];
      return [
        { label: "Workspace", items: main },
        ...(game.length ? [{ label: "Recognition", items: game }] : []),
      ];
    }
    if (currentUser.role === "district_manager") {
      const main: Item[] = [
        { to: "/", label: "District Dashboard" },
        { to: "/shops", label: "Shops" },
        { to: "/action-plans", label: "Action Plans" },
        { to: "/appeals", label: "Appeals" },
        { to: "/analytics", label: "Analytics" },
        { to: "/digest", label: "Weekly Digest" },
        { to: "/settings", label: "Settings" },
      ];
      const game: Item[] = systemConfig.gamificationEnabled
        ? [
            { to: "/leaderboard", label: "Leagues" },
            { to: "/challenges", label: "Challenges" },
          ]
        : [];
      return [
        { label: "Workspace", items: main },
        ...(game.length ? [{ label: "Recognition", items: game }] : []),
      ];
    }
    // admin
    const main: Item[] = [
      { to: "/", label: "Company Dashboard" },
      { to: "/shops", label: "Shops" },
      { to: "/shops/new", label: "Enter Shop" },
      { to: "/action-plans", label: "Action Plans" },
      { to: "/appeals", label: "Appeals" },
      { to: "/analytics", label: "Analytics" },
      { to: "/digest", label: "Weekly Digest" },
    ];
    const admin: Item[] = [
      { to: "/admin/rubrics", label: "Rubrics" },
      { to: "/admin/users", label: "Users" },
      { to: "/admin/import", label: "Agency Import" },
      { to: "/admin/calibration", label: "Calibration" },
      { to: "/admin/config", label: "System Config" },
      { to: "/admin/audit", label: "Audit Log" },
    ];
    const game: Item[] = systemConfig.gamificationEnabled
      ? [
          { to: "/leaderboard", label: "Leagues" },
          { to: "/challenges", label: "Challenges" },
          { to: "/hunt", label: "The Hunt" },
        ]
      : [];
    return [
      { label: "Workspace", items: main },
      ...(game.length ? [{ label: "Recognition", items: game }] : []),
      { label: "Admin", items: admin },
    ];
  })();

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          STINE<span className="accent"> · </span>Mystery Shop
        </div>
        <span className="who">Phase 1–4 demo · in-memory data</span>
        <div className="spacer" />
        <NotificationBell />
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
        {sections.map((sec) => (
          <div key={sec.label}>
            <div className="nav-section">{sec.label}</div>
            {sec.items.map((item) => (
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
          </div>
        ))}
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
