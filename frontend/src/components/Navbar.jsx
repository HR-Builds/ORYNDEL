import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, logout } = useAuth();

  const close = () => setOpen(false);

  return (
    <nav className="nav">
      <Link to="/" className="nav-logo" onClick={close}>
        ORYNDE<span>L</span>
      </Link>

      <button className="nav-burger" onClick={() => setOpen(!open)} aria-label="Menu">
        {open ? "CLOSE" : "MENU"}
      </button>

      <div className={`nav-links ${open ? "open" : ""}`}>
        <NavLink to="/" end onClick={close}>Home</NavLink>
        <NavLink to="/shop" onClick={close}>Shop</NavLink>
        <NavLink to="/contact" onClick={close}>Contact</NavLink>
        <NavLink to="/cart" onClick={close}>Cart</NavLink>
        {user ? (
          <>
            <NavLink to="/orders" onClick={close}>Orders</NavLink>
            {isAdmin && <NavLink to="/admin" onClick={close}>Admin</NavLink>}
            <NavLink to="/" onClick={() => { logout(); close(); }}>Logout</NavLink>
          </>
        ) : (
          <NavLink to="/login" onClick={close}>Login</NavLink>
        )}
      </div>
    </nav>
  );
}