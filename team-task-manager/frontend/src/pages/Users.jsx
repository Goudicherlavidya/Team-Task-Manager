import { useState, useEffect } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) { navigate("/dashboard"); return; }
    api.get("/users")
      .then(r => setUsers(r.data.users))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}><span className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p className="page-sub">{users.length} registered users</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["User", "Email", "Role", "Joined"].map(h => (
                <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 12, color: "var(--text2)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "14px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--accent2))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 700, color: "#fff", fontSize: 13, flexShrink: 0 }}>
                      {u.name[0].toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500, color: "var(--text)" }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 20px", color: "var(--text2)", fontSize: 13 }}>{u.email}</td>
                <td style={{ padding: "14px 20px" }}><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                <td style={{ padding: "14px 20px", color: "var(--text3)", fontSize: 13 }}>
                  {(() => { try { return format(parseISO(u.created_at), "MMM d, yyyy"); } catch { return u.created_at; } })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
