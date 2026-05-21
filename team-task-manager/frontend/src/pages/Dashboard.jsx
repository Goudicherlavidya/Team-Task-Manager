import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import { format, parseISO, isValid } from "date-fns";
import "./Dashboard.css";

function StatCard({ label, value, color }) {
  return (
    <div className="stat-card" style={{ "--accent-color": color }}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard")
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}><span className="spinner" /></div>;

  const { stats, recentTasks, overdueTasks } = data || {};

  const formatDate = (d) => {
    if (!d) return "—";
    try { const p = parseISO(d); return isValid(p) ? format(p, "MMM d") : d; } catch { return d; }
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-sub">Good to see you, {user?.name?.split(" ")[0]} 👋</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Projects" value={stats?.total_projects ?? 0} color="#6c63ff" />
        <StatCard label="Total Tasks" value={stats?.total_tasks ?? 0} color="#9090aa" />
        <StatCard label="To Do" value={stats?.todo ?? 0} color="#6c63ff" />
        <StatCard label="In Progress" value={stats?.in_progress ?? 0} color="#f7b731" />
        <StatCard label="Completed" value={stats?.done ?? 0} color="#43e97b" />
        <StatCard label="Overdue" value={stats?.overdue ?? 0} color="#ff4757" />
        {isAdmin && <StatCard label="Total Users" value={stats?.total_users ?? 0} color="#ff6584" />}
      </div>

      <div className="dashboard-grid">
        <section className="dash-section">
          <h2 className="section-title">Recent Tasks</h2>
          {recentTasks?.length === 0 ? (
            <div className="empty-state"><p>No tasks yet</p></div>
          ) : (
            <div className="task-list">
              {recentTasks?.map(task => (
                <Link key={task.id} to={`/projects/${task.project_id}`} className="task-row">
                  <div className="task-row-left">
                    <span className={`badge badge-${task.status}`}>{task.status.replace("_", " ")}</span>
                    <div>
                      <div className="task-row-title">{task.title}</div>
                      <div className="task-row-meta">{task.project_name} · {task.assignee_name || "Unassigned"}</div>
                    </div>
                  </div>
                  <div className="task-row-right">
                    <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                    {task.due_date && <span className="due-date">{formatDate(task.due_date)}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="dash-section">
          <h2 className="section-title" style={{ color: "var(--high)" }}>⚠ Overdue Tasks</h2>
          {overdueTasks?.length === 0 ? (
            <div className="empty-state" style={{ padding: "30px 20px" }}>
              <p style={{ color: "var(--done)" }}>✓ No overdue tasks!</p>
            </div>
          ) : (
            <div className="task-list">
              {overdueTasks?.map(task => (
                <Link key={task.id} to={`/projects/${task.project_id}`} className="task-row overdue">
                  <div className="task-row-left">
                    <span className={`badge badge-${task.status}`}>{task.status.replace("_", " ")}</span>
                    <div>
                      <div className="task-row-title">{task.title}</div>
                      <div className="task-row-meta">{task.project_name}</div>
                    </div>
                  </div>
                  <div className="task-row-right">
                    <span className="due-date overdue-date">Due {formatDate(task.due_date)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
