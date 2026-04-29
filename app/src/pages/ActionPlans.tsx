import { Link } from "react-router-dom";
import { useStore } from "../store";
import { formatRelative } from "../format";

export default function ActionPlans() {
  const { actionPlans, currentUser, getUser, getShop, getLocation } = useStore();

  let visible = actionPlans;
  if (currentUser.role === "employee") {
    visible = visible.filter((a) => a.assignedTo === currentUser.id);
  } else if (currentUser.role === "store_manager") {
    visible = visible.filter((a) => {
      const shop = getShop(a.shopId);
      return shop?.locationId === currentUser.primaryLocationId;
    });
  }

  const sorted = [...visible].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate),
  );
  const open = sorted.filter((p) => p.status !== "verified" && p.status !== "completed");
  const done = sorted.filter((p) => p.status === "verified" || p.status === "completed");

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Action plans</h1>
          <div className="sub">{open.length} open · {done.length} closed</div>
        </div>
      </div>

      <div className="card">
        <h2>Open</h2>
        {open.length === 0 ? (
          <div className="empty">Nothing open.</div>
        ) : (
          <table className="list">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Location</th>
                <th>Category</th>
                <th>Due</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {open.map((p) => {
                const emp = getUser(p.assignedTo);
                const shop = getShop(p.shopId);
                const loc = shop ? getLocation(shop.locationId) : null;
                return (
                  <tr key={p.id}>
                    <td>{emp?.fullName}</td>
                    <td>{loc?.name}</td>
                    <td>{p.category}</td>
                    <td>{formatRelative(p.dueDate)}</td>
                    <td>
                      <span className="pill">{p.status.replace(/_/g, " ")}</span>
                    </td>
                    <td>
                      <Link className="btn small" to={`/shops/${p.shopId}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Closed</h2>
        {done.length === 0 ? (
          <div className="empty">Nothing closed yet.</div>
        ) : (
          <table className="list">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Category</th>
                <th>Closed</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {done.map((p) => {
                const emp = getUser(p.assignedTo);
                return (
                  <tr key={p.id}>
                    <td>{emp?.fullName}</td>
                    <td>{p.category}</td>
                    <td>
                      {p.verifiedAt
                        ? formatRelative(p.verifiedAt)
                        : p.completedAt
                        ? formatRelative(p.completedAt)
                        : "—"}
                    </td>
                    <td>
                      <span className="pill">{p.status.replace(/_/g, " ")}</span>
                    </td>
                    <td>
                      <Link className="btn small" to={`/shops/${p.shopId}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
