import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { formatDate, scoreClass } from "../format";

export default function ShopList() {
  const { shops, currentUser, getLocation, getUser, locations } = useStore();
  const navigate = useNavigate();
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  let visible = shops;
  if (currentUser.role === "employee") {
    visible = visible.filter((s) => s.evaluatedEmployeeId === currentUser.id);
  } else if (currentUser.role === "store_manager") {
    visible = visible.filter((s) => s.locationId === currentUser.primaryLocationId);
  } else if (currentUser.role === "district_manager") {
    const ids = new Set(
      locations
        .filter((l) => currentUser.districtIds.includes(l.district))
        .map((l) => l.id),
    );
    visible = visible.filter((s) => ids.has(s.locationId));
  }

  if (type !== "all") visible = visible.filter((s) => s.type === type);
  if (status !== "all") visible = visible.filter((s) => s.status === status);
  visible = [...visible].sort((a, b) => b.shopDate.localeCompare(a.shopDate));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Shops</h1>
          <div className="sub">{visible.length} record{visible.length === 1 ? "" : "s"}</div>
        </div>
        {(currentUser.role === "store_manager" || currentUser.role === "admin") && (
          <Link to="/shops/new" className="btn primary">+ Enter shop</Link>
        )}
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 16 }}>
          <div>
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="all">All</option>
              <option value="visit">In-store visit</option>
              <option value="call">Mystery caller</option>
            </select>
          </div>
          <div>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under review</option>
              <option value="action_assigned">Action assigned</option>
              <option value="appealed">Appealed</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="empty">No shops match.</div>
        ) : (
          <table className="list">
            <thead>
              <tr>
                <th>Date</th>
                <th>Location</th>
                <th>Type</th>
                <th>Employee</th>
                <th>Shopper</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => {
                const loc = getLocation(s.locationId);
                const emp = s.evaluatedEmployeeId
                  ? getUser(s.evaluatedEmployeeId)
                  : null;
                return (
                  <tr
                    key={s.id}
                    className="clickable"
                    onClick={() => navigate(`/shops/${s.id}`)}
                  >
                    <td>{formatDate(s.shopDate)}</td>
                    <td>{loc?.name}</td>
                    <td>{s.type === "call" ? "Caller" : "Visit"}</td>
                    <td>{emp?.fullName ?? <span className="muted">store-level</span>}</td>
                    <td>{s.shopperName}</td>
                    <td>
                      <span className={`score ${scoreClass(s.percentage)}`}>
                        {s.percentage}%
                      </span>
                    </td>
                    <td>
                      <span className="pill">{s.status.replace(/_/g, " ")}</span>
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
