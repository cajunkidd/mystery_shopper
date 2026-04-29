import { useStore } from "../store";
import { formatRelative } from "../format";

export default function AuditLog() {
  const { auditLog, getUser } = useStore();

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Audit log</h1>
          <div className="sub">
            Every score change, status change, export, and login is recorded
            here. Admin-only.
          </div>
        </div>
      </div>

      <div className="card">
        {auditLog.length === 0 ? (
          <div className="empty">No audit entries yet.</div>
        ) : (
          <table className="list">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Entity</th>
                <th>Action</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((e) => (
                <tr key={e.id}>
                  <td>{formatRelative(e.occurredAt)}</td>
                  <td>{getUser(e.actorId)?.fullName ?? e.actorId}</td>
                  <td>
                    <strong>{e.entityType}</strong>{" "}
                    <span className="muted">{e.entityId}</span>
                  </td>
                  <td>
                    <span className="pill">{e.action.replace(/_/g, " ")}</span>
                  </td>
                  <td>{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
