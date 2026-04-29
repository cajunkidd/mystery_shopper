import { useStore } from "../store";

export default function Settings() {
  const { currentUser, shops, reviews, actionPlans, appeals, comments, pointsLedger, userBadges, getLocation } =
    useStore();

  function exportMyData() {
    const myShops = shops.filter((s) => s.evaluatedEmployeeId === currentUser.id);
    const myShopIds = new Set(myShops.map((s) => s.id));
    const data = {
      generatedAt: new Date().toISOString(),
      user: {
        id: currentUser.id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        role: currentUser.role,
        primaryLocation: getLocation(currentUser.primaryLocationId ?? "")?.name ?? null,
        hireDate: currentUser.hireDate,
      },
      shops: myShops,
      reviews: reviews.filter((r) => myShopIds.has(r.shopId)),
      actionPlans: actionPlans.filter((p) => p.assignedTo === currentUser.id),
      appeals: appeals.filter((a) => a.filedBy === currentUser.id),
      comments: comments.filter((c) => c.authorId === currentUser.id),
      points: pointsLedger.filter((p) => p.userId === currentUser.id),
      badges: userBadges.filter((b) => b.userId === currentUser.id),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentUser.id}-data-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <div className="sub">Notifications and your data.</div>
        </div>
      </div>

      <div className="card">
        <h2>Notifications</h2>
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
          In-app inbox is always on. Email and SMS are configurable per the spec
          (SMS requires opt-in, Phase 2+).
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 400 }}>
            <input type="checkbox" defaultChecked /> Email notifications
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 400 }}>
            <input type="checkbox" /> SMS notifications (opt-in)
          </label>
        </div>
      </div>

      <div className="card">
        <h2>Your data</h2>
        <p>
          Per spec §11, you can request a full export of your own data at any
          time. Click below for an immediate JSON download covering your shops,
          reviews, action plans, appeals, comments, and points.
        </p>
        <button className="btn primary" onClick={exportMyData}>
          Download my data (JSON)
        </button>
      </div>

      <div className="card">
        <h2>Account</h2>
        <div className="muted" style={{ fontSize: 12 }}>
          Mock auth — managed via the role switcher in the top bar.
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Email</label>
          <div>{currentUser.email}</div>
        </div>
        <div className="field">
          <label>Role</label>
          <div>{currentUser.role.replace(/_/g, " ")}</div>
        </div>
      </div>
    </>
  );
}
