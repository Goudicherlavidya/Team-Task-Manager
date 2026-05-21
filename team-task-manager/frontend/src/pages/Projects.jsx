import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import "./Projects.css";

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await api.post("/projects", form);
      onCreated(r.data.project);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create project");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 style={{ marginBottom: 20 }}>New Project</h2>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Project Name *</label>
            <input placeholder="e.g. Website Redesign" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea placeholder="What is this project about?" rows={3} value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    api.get("/projects")
      .then(r => setProjects(r.data.projects))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = (project) => {
    setProjects(p => [project, ...p]);
    setShowCreate(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}><span className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="page-sub">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Project</button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <h3>No projects yet</h3>
          <p>Create your first project to get started</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>+ New Project</button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(p => (
            <Link key={p.id} to={`/projects/${p.id}`} className="project-card">
              <div className="project-card-header">
                <div className="project-icon">{p.name[0].toUpperCase()}</div>
                <span className={`badge badge-${p.status === "active" ? "done" : "member"}`}>{p.status}</span>
              </div>
              <h3 className="project-name">{p.name}</h3>
              {p.description && <p className="project-desc">{p.description}</p>}
              <div className="project-stats">
                <span>◈ {p.task_count} tasks</span>
                <span>◉ {p.member_count} members</span>
              </div>
              {p.my_role && <div style={{ marginTop: 8 }}><span className={`badge badge-${p.my_role}`}>{p.my_role}</span></div>}
            </Link>
          ))}
        </div>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
    </div>
  );
}
