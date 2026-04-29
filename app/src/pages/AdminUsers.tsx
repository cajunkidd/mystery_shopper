import { useStore } from "../store";

export default function AdminUsers() {
  const { users, getLocation } = useStore();
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <div className="sub">{users.length} accounts</div>
        </div>
      </div>
      <div className="card">
        <table className="list">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Location / district</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const loc = u.primaryLocationId ? getLocation(u.primaryLocationId) : null;
              return (
                <tr key={u.id}>
                  <td><strong>{u.fullName}</strong></td>
                  <td>{u.email}</td>
                  <td>
                    <span className="pill">{u.role.replace(/_/g, " ")}</span>
                  </td>
                  <td>
                    {loc?.name ?? (u.districtIds.length ? u.districtIds.join(", ") : <span className="muted">—</span>)}
                  </td>
                  <td>
                    <span className={"pill " + (u.active ? "green" : "")}>
                      {u.active ? "active" : "inactive"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
