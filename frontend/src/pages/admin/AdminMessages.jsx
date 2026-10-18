import { useEffect, useState } from "react";
import api from "../../api/client";

export default function AdminMessages() {
  const [items, setItems] = useState([]);

  const load = () => api.get("/admin/contacts").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const remove = async (m) => {
    if (!window.confirm("Delete this message?")) return;
    await api.delete(`/admin/contacts/${m.id}`);
    load();
  };

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">Inbox</p>
          <h2>Messages</h2>
        </div>
      </div>

      <div className="panel">
        {items.length === 0 ? (
          <p className="file-hint">No messages yet. Contact form submissions appear here.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Date</th><th>From</th><th>Contact</th><th>Message</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id}>
                    <td style={{ whiteSpace: "nowrap", color: "var(--muted)", fontSize: "0.78rem" }}>
                      {new Date(m.created_at).toLocaleString()}
                    </td>
                    <td>
                      {m.first_name} {m.last_name}
                      <br />
                      <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{m.email}</span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{m.number}</td>
                    <td>
                      <span className="run-result">{m.message}</span>
                    </td>
                    <td>
                      <button className="mini-btn danger" onClick={() => remove(m)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}