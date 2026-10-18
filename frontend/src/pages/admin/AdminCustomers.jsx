import { useEffect, useState } from "react";
import api from "../../api/client";

export default function AdminCustomers() {
  const [items, setItems] = useState([]);

  const load = () => api.get("/admin/users", { params: { limit: 100 } }).then((r) => setItems(r.data.items));
  useEffect(() => { load(); }, []);

  const toggleActive = async (u) => {
    await api.patch(`/admin/users/${u.id}/active`);
    load();
  };

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">People</p>
          <h2>Customers</h2>
        </div>
      </div>
      <div className="panel table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Joined</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td><span className={`badge ${u.is_active ? "green" : "red"}`}>{u.is_active ? "Active" : "Blocked"}</span></td>
                <td><button className="mini-btn" onClick={() => toggleActive(u)}>{u.is_active ? "Block" : "Unblock"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}