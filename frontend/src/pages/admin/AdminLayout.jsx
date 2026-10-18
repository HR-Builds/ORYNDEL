import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const LINKS = [
  ["", "Dashboard"],
  ["products", "Products"],
  ["orders", "Orders"],
  ["customers", "Customers"],
  ["promos", "Promo Codes"],
  ["sliders", "Sliders"],
  ["messages", "Messages"],
  ["agents", "AI Agents"],
];

export default function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) return <p className="loading-state" style={{ paddingTop: "14rem" }}>Loading</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin) return <Navigate to="/" replace />;

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <p className="admin-side-title">ORYNDEL<br />Admin</p>
        {LINKS.map(([to, label]) => (
          <NavLink key={to} to={`/admin/${to}`} end={to === ""}>{label}</NavLink>
        ))}
        <NavLink to="/" className="admin-storefront">← Storefront</NavLink>
      </aside>
      <div className="admin-main"><Outlet /></div>
    </div>
  );
}