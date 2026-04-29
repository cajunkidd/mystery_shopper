import { Link } from "react-router-dom";
import { useStore } from "../store";
import { formatRelative } from "../format";

export default function Appeals() {
  const { appeals, currentUser, getShop, getUser, getLocation } = useStore();

  let visible = appeals;
  if (currentUser.role === "store_manager") {
    visible = visible.filter((a) => {
      const shop = getShop(a.shopId);
      return shop?.locationId === currentUser.primaryLocationId;
    });
  }

  const open = visible.filter((a) => a.status === "open" || a.status === "under_review");
  const closed = visible.filter((a) => !["open", "under_review"].includes(a.status));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Appeals</h1>
          <div className="sub">{open.length} open · {closed.length} resolved</div>
        </div>
      </div>

      <div className="card">
        <h2>Open</h2>
        {open.length === 0 ? (
          <div className="empty">No open appeals.</div>
        ) : (
          <table className="list">
            <thead>
              <tr>
                <th>Filed</th>
                <th>Employee</th>
                <th>Location</th>
                <th>Reason</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {open.map((a) => {
                const emp = getUser(a.filedBy);
                const shop = getShop(a.shopId);
                const loc = shop ? getLocation(shop.locationId) : null;
                return (
                  <tr key={a.id}>
                    <td>{formatRelative(a.filedAt)}</td>
                    <td>{emp?.fullName}</td>
                    <td>{loc?.name}</td>
                    <td style={{ maxWidth: 360 }}>{a.reason}</td>
                    <td>
                      <span className="pill">{a.status.replace(/_/g, " ")}</span>
                    </td>
                    <td>
                      <Link className="btn small" to={`/shops/${a.shopId}`}>
                        Resolve
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
        <h2>Resolved</h2>
        {closed.length === 0 ? (
          <div className="empty">No resolved appeals yet.</div>
        ) : (
          <table className="list">
            <thead>
              <tr>
                <th>Resolved</th>
                <th>Employee</th>
                <th>Decision</th>
                <th>Adjustment</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {closed.map((a) => {
                const emp = getUser(a.filedBy);
                return (
                  <tr key={a.id}>
                    <td>{a.resolvedAt ? formatRelative(a.resolvedAt) : "—"}</td>
                    <td>{emp?.fullName}</td>
                    <td>
                      <span className="pill">{a.status.replace(/_/g, " ")}</span>
                    </td>
                    <td>
                      {a.scoreAdjustmentApplied != null
                        ? `${a.scoreAdjustmentApplied > 0 ? "+" : ""}${a.scoreAdjustmentApplied}`
                        : "—"}
                    </td>
                    <td>
                      <Link className="btn small" to={`/shops/${a.shopId}`}>
                        View
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
