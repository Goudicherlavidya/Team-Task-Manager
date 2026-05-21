const express = require("express");
const { getDb } = require("../db/database");
const { authenticate, requireProjectAccess } = require("../middleware/auth");

const router = express.Router({ mergeParams: true });

// GET /api/projects/:projectId/tasks
router.get("/", authenticate, requireProjectAccess, (req, res) => {
  const db = getDb();
  const { status, priority, assigned_to } = req.query;

  let sql = `
    SELECT t.*,
      u1.name as assignee_name, u1.email as assignee_email,
      u2.name as creator_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assigned_to = u1.id
    LEFT JOIN users u2 ON t.created_by = u2.id
    WHERE t.project_id = ?
  `;
  const params = [req.params.projectId];

  if (status) { sql += " AND t.status = ?"; params.push(status); }
  if (priority) { sql += " AND t.priority = ?"; params.push(priority); }
  if (assigned_to) { sql += " AND t.assigned_to = ?"; params.push(assigned_to); }

  sql += " ORDER BY t.created_at DESC";
  const tasks = db.prepare(sql).all(...params);
  res.json({ tasks });
});

// POST /api/projects/:projectId/tasks
router.post("/", authenticate, requireProjectAccess, (req, res) => {
  const { title, description, assigned_to, priority, due_date } = req.body;
  if (!title) return res.status(400).json({ error: "Task title is required" });

  const db = getDb();

  if (assigned_to) {
    const isMember = db.prepare("SELECT id FROM project_members WHERE project_id = ? AND user_id = ?")
      .get(req.params.projectId, assigned_to);
    if (!isMember) return res.status(400).json({ error: "Assigned user is not a project member" });
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, project_id, assigned_to, created_by, priority, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(), description || null, req.params.projectId,
    assigned_to || null, req.user.id, priority || "medium", due_date || null
  );

  const task = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u2.name as creator_name
    FROM tasks t LEFT JOIN users u1 ON t.assigned_to = u1.id
    LEFT JOIN users u2 ON t.created_by = u2.id WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ task });
});

// GET /api/projects/:projectId/tasks/:id
router.get("/:id", authenticate, requireProjectAccess, (req, res) => {
  const db = getDb();
  const task = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u1.email as assignee_email, u2.name as creator_name
    FROM tasks t LEFT JOIN users u1 ON t.assigned_to = u1.id
    LEFT JOIN users u2 ON t.created_by = u2.id
    WHERE t.id = ? AND t.project_id = ?
  `).get(req.params.id, req.params.projectId);

  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json({ task });
});

// PUT /api/projects/:projectId/tasks/:id
router.put("/:id", authenticate, requireProjectAccess, (req, res) => {
  const db = getDb();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ? AND project_id = ?")
    .get(req.params.id, req.params.projectId);
  if (!task) return res.status(404).json({ error: "Task not found" });

  // Members can only update status of their own tasks; admins can update anything
  const isProjectAdmin = req.projectMember?.role === "admin" || req.user.role === "admin";
  const isAssignee = task.assigned_to === req.user.id || task.created_by === req.user.id;

  if (!isProjectAdmin && !isAssignee)
    return res.status(403).json({ error: "You can only update tasks assigned to you" });

  const { title, description, assigned_to, status, priority, due_date } = req.body;

  if (assigned_to && !isProjectAdmin)
    return res.status(403).json({ error: "Only admins can reassign tasks" });

  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      assigned_to = CASE WHEN ? IS NOT NULL THEN ? ELSE assigned_to END,
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      due_date = COALESCE(?, due_date),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title || null, description || null,
    assigned_to !== undefined ? assigned_to : null,
    assigned_to !== undefined ? assigned_to : null,
    status || null, priority || null, due_date || null,
    req.params.id
  );

  const updated = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u2.name as creator_name
    FROM tasks t LEFT JOIN users u1 ON t.assigned_to = u1.id
    LEFT JOIN users u2 ON t.created_by = u2.id WHERE t.id = ?
  `).get(req.params.id);

  res.json({ task: updated });
});

// DELETE /api/projects/:projectId/tasks/:id
router.delete("/:id", authenticate, requireProjectAccess, (req, res) => {
  const db = getDb();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ? AND project_id = ?")
    .get(req.params.id, req.params.projectId);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const isProjectAdmin = req.projectMember?.role === "admin" || req.user.role === "admin";
  if (!isProjectAdmin && task.created_by !== req.user.id)
    return res.status(403).json({ error: "Only admins or task creators can delete tasks" });

  db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  res.json({ message: "Task deleted" });
});

module.exports = router;
