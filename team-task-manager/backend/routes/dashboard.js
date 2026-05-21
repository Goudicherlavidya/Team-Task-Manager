const express = require("express");
const { getDb } = require("../db/database");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/dashboard - personal dashboard stats
router.get("/", authenticate, (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];

  let stats;
  if (req.user.role === "admin") {
    stats = {
      total_projects: db.prepare("SELECT COUNT(*) as c FROM projects").get().c,
      total_tasks: db.prepare("SELECT COUNT(*) as c FROM tasks").get().c,
      todo: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='todo'").get().c,
      in_progress: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='in_progress'").get().c,
      done: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='done'").get().c,
      overdue: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE due_date < ? AND status != 'done'").get(today).c,
      total_users: db.prepare("SELECT COUNT(*) as c FROM users").get().c,
    };
  } else {
    stats = {
      total_projects: db.prepare("SELECT COUNT(*) as c FROM project_members WHERE user_id=?").get(req.user.id).c,
      total_tasks: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE assigned_to=?").get(req.user.id).c,
      todo: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE assigned_to=? AND status='todo'").get(req.user.id).c,
      in_progress: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE assigned_to=? AND status='in_progress'").get(req.user.id).c,
      done: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE assigned_to=? AND status='done'").get(req.user.id).c,
      overdue: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE assigned_to=? AND due_date < ? AND status != 'done'").get(req.user.id, today).c,
    };
  }

  // Recent tasks
  const recentTasks = req.user.role === "admin"
    ? db.prepare(`
        SELECT t.*, p.name as project_name, u.name as assignee_name
        FROM tasks t JOIN projects p ON t.project_id = p.id
        LEFT JOIN users u ON t.assigned_to = u.id
        ORDER BY t.updated_at DESC LIMIT 10
      `).all()
    : db.prepare(`
        SELECT t.*, p.name as project_name, u.name as assignee_name
        FROM tasks t JOIN projects p ON t.project_id = p.id
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.assigned_to = ?
        ORDER BY t.updated_at DESC LIMIT 10
      `).all(req.user.id);

  // Overdue tasks
  const overdueTasks = req.user.role === "admin"
    ? db.prepare(`
        SELECT t.*, p.name as project_name, u.name as assignee_name
        FROM tasks t JOIN projects p ON t.project_id = p.id
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.due_date < ? AND t.status != 'done'
        ORDER BY t.due_date ASC LIMIT 10
      `).all(today)
    : db.prepare(`
        SELECT t.*, p.name as project_name
        FROM tasks t JOIN projects p ON t.project_id = p.id
        WHERE t.assigned_to = ? AND t.due_date < ? AND t.status != 'done'
        ORDER BY t.due_date ASC LIMIT 10
      `).all(req.user.id, today);

  res.json({ stats, recentTasks, overdueTasks });
});

// GET /api/users - list all users (admin only)
router.get("/users", authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const users = db.prepare("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC").all();
  res.json({ users });
});

// GET /api/users/search?q=email
router.get("/users/search", authenticate, (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ users: [] });
  const db = getDb();
  const users = db.prepare(
    "SELECT id, name, email, role FROM users WHERE email LIKE ? OR name LIKE ? LIMIT 10"
  ).all(`%${q}%`, `%${q}%`);
  res.json({ users });
});

module.exports = router;
