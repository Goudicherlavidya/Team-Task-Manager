import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Layout.css";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "⬡" },
  { to: "/projects", label: "Projects", icon: "◈" },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">✦</span>
          <span className="logo-text">TaskFlow</span>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className={`badge badge-${user?.role}`}>{user?.role}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <span className="nav-icon">◉</span>
              <span>Users</span>
            </NavLink>
          )}
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <span>⇥</span> Sign Out
        </button>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
