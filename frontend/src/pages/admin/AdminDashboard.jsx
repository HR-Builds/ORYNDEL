import { useEffect, useState } from "react";
import api from "../../api/client";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/admin/stats").then((r) => setStats(r.data));
  }, []);

  if (!stats) return <p className="loading-state">Loading</p>;

  const CARDS = [
    ["Total Revenue", `PKR ${Number(stats.revenue).toLocaleString()}`],
    ["Total Orders", stats.orders],
    ["Pending Orders", stats.pending_orders],
    ["Flagged Orders", stats.flagged_orders],
    ["Customers", stats.users],
    ["Products", stats.products],
    ["Low Stock (<5)", stats.low_stock],
    ["Messages", stats.messages],
  ];

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Dashboard</h2>
        </div>
      </div>
      <div className="stat-grid">
        {CARDS.map(([label, value]) => (
          <div className="stat-card" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </>
  );
}