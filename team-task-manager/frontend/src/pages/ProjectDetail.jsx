import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { format, parseISO, isValid } from "date-fns";
import "./ProjectDetail.css";

function TaskModal({ task, projectId, members, onClose, onSaved }) {
  const { user, isAdmin } = useAuth();
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    assigned_to: task?.assigned_to || "",
    status: task?.status || "todo",
    priority: task?.priority || "medium",
    due_date: task?.due_date ? task.due_date.split("T")[0] : "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const projectMember = members?.find(m => m.id === user.id);
  const canEditAll = isAdmin || projectMember?.project_role === "admin";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const payload = { ...form, assigned_to: form.assigned_to || null, due_date: form.due_date || null };
    try {
      let r;
      if (isEdit) r = await api.put(`/projects/${projectId}/tasks/${task.id}`, payload);
      else r = await api.post(`/projects/${projectId}/tasks`, payload);
      onSaved(r.data.task, isEdit);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save task");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 style={{ marginBottom: 20 }}>{isEdit ? "Edit Task" : "New Task"}</h2>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input placeholder="What needs to be done?" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea placeholder="Add details..." rows={3} value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            {canEditAll && (
              <div className="form-group">
                <label>Assign To</label>
                <select value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMemberModal({ projectId, onClose, onAdded }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post(`/projects/${projectId}/members`, { email, role });
      onAdded();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add member");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 style={{ marginBottom: 20 }}>Add Member</h2>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email address</label>
            <input type="email" placeholder="member@company.com" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Role in project</label>
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Adding..." : "Add Member"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [taskModal, setTaskModal] = useState(null); // null | "new" | task obj
  const [showAddMember, setShowAddMember] = useState(false);

  const loadData = async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks`),
      ]);
      setProject(projRes.data.project);
      setMembers(projRes.data.members);
      setTasks(taskRes.data.tasks);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) navigate("/projects");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [id]);

  const loadTasks = async () => {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterPriority) params.set("priority", filterPriority);
    const r = await api.get(`/projects/${id}/tasks?${params}`);
    setTasks(r.data.tasks);
  };

  useEffect(() => { if (project) loadTasks(); }, [filterStatus, filterPriority]);

  const handleTaskSaved = (task, isEdit) => {
    if (isEdit) setTasks(ts => ts.map(t => t.id === task.id ? task : t));
    else setTasks(ts => [task, ...ts]);
    setTaskModal(null);
  };

  const deleteTask = async (taskId) => {
    if (!confirm("Delete this task?")) return;
    await api.delete(`/projects/${id}/tasks/${taskId}`);
    setTasks(ts => ts.filter(t => t.id !== taskId));
  };

  const removeMember = async (userId) => {
    if (!confirm("Remove this member?")) return;
    await api.delete(`/projects/${id}/members/${userId}`);
    setMembers(ms => ms.filter(m => m.id !== userId));
  };

  const deleteProject = async () => {
    if (!confirm("Delete this project and all its tasks? This cannot be undone.")) return;
    await api.delete(`/projects/${id}`);
    navigate("/projects");
  };

  const formatDate = (d) => {
    if (!d) return null;
    try { const p = parseISO(d); return isValid(p) ? format(p, "MMM d, yyyy") : d; } catch { return d; }
  };

  const projectMember = members.find(m => m.id === user.id);
  const canManage = isAdmin || projectMember?.project_role === "admin";

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}><span className="spinner" /></div>;
  if (!project) return null;

  const todoTasks = tasks.filter(t => t.status === "todo");
  const inProgressTasks = tasks.filter(t => t.status === "in_progress");
  const doneTasks = tasks.filter(t => t.status === "done");

  return (
    <div className="project-detail">
      <div className="project-detail-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/projects")}>← Projects</button>
        <div className="project-header-main">
          <div>
            <h1>{project.name}</h1>
            {project.description && <p className="page-sub">{project.description}</p>}
          </div>
          <div className="project-header-actions">
            <button className="btn btn-primary btn-sm" onClick={() => setTaskModal("new")}>+ New Task</button>
            {canManage && <button className="btn btn-danger btn-sm" onClick={deleteProject}>Delete Project</button>}
          </div>
        </div>
      </div>

      <div className="project-progress">
        {tasks.length > 0 && (
          <div className="progress-bar-wrap">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(doneTasks.length / tasks.length) * 100}%` }} />
            </div>
            <span className="progress-label">{doneTasks.length}/{tasks.length} tasks done ({Math.round((doneTasks.length/tasks.length)*100)}%)</span>
          </div>
        )}
        <div className="project-status-badges">
          <span className="badge badge-todo">{todoTasks.length} todo</span>
          <span className="badge badge-in_progress">{inProgressTasks.length} in progress</span>
          <span className="badge badge-done">{doneTasks.length} done</span>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === "tasks" ? "active" : ""}`} onClick={() => setActiveTab("tasks")}>Tasks ({tasks.length})</button>
        <button className={`tab ${activeTab === "members" ? "active" : ""}`} onClick={() => setActiveTab("members")}>Members ({members.length})</button>
      </div>

      {activeTab === "tasks" && (
        <div className="tasks-section">
          <div className="tasks-filters">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 160 }}>
              <option value="">All Status</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ maxWidth: 160 }}>
              <option value="">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {tasks.length === 0 ? (
            <div className="empty-state">
              <h3>No tasks yet</h3>
              <p>Create the first task for this project</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setTaskModal("new")}>+ New Task</button>
            </div>
          ) : (
            <div className="task-cards">
              {tasks.map(task => {
                const today = new Date().toISOString().split("T")[0];
                const isOverdue = task.due_date && task.due_date < today && task.status !== "done";
                return (
                  <div key={task.id} className={`task-card ${isOverdue ? "overdue" : ""}`}>
                    <div className="task-card-top">
                      <div className="task-card-badges">
                        <span className={`badge badge-${task.status}`}>{task.status.replace("_", " ")}</span>
                        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                        {isOverdue && <span className="badge" style={{ background: "rgba(255,71,87,0.15)", color: "var(--high)" }}>overdue</span>}
                      </div>
                      <div className="task-card-actions">
                        <button className="icon-btn" onClick={() => setTaskModal(task)} title="Edit">✎</button>
                        {(canManage || task.created_by === user.id) && (
                          <button className="icon-btn danger" onClick={() => deleteTask(task.id)} title="Delete">✕</button>
                        )}
                      </div>
                    </div>
                    <h3 className="task-title">{task.title}</h3>
                    {task.description && <p className="task-desc">{task.description}</p>}
                    <div className="task-card-footer">
                      <span className="task-meta">{task.assignee_name ? `→ ${task.assignee_name}` : "Unassigned"}</span>
                      {task.due_date && <span className={`task-meta ${isOverdue ? "text-danger" : ""}`}>{formatDate(task.due_date)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "members" && (
        <div className="members-section">
          {canManage && (
            <div style={{ marginBottom: 16 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddMember(true)}>+ Add Member</button>
            </div>
          )}
          <div className="members-list">
            {members.map(m => (
              <div key={m.id} className="member-row">
                <div className="member-avatar">{m.name[0].toUpperCase()}</div>
                <div className="member-info">
                  <div className="member-name">{m.name} {m.id === user.id && <span style={{ color: "var(--text3)", fontSize: 12 }}>(you)</span>}</div>
                  <div className="member-email">{m.email}</div>
                </div>
                <div className="member-roles">
                  <span className={`badge badge-${m.project_role}`}>{m.project_role}</span>
                  <span className={`badge badge-${m.global_role}`}>{m.global_role}</span>
                </div>
                {canManage && m.id !== user.id && (
                  <button className="icon-btn danger btn-sm" onClick={() => removeMember(m.id)}>✕</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {taskModal && (
        <TaskModal
          task={taskModal === "new" ? null : taskModal}
          projectId={id}
          members={members}
          onClose={() => setTaskModal(null)}
          onSaved={handleTaskSaved}
        />
      )}
      {showAddMember && (
        <AddMemberModal projectId={id} onClose={() => setShowAddMember(false)} onAdded={() => { setShowAddMember(false); loadData(); }} />
      )}
    </div>
  );
}
