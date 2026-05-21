const express = require("express");
const { getDb } = require("../db/database");
const { authenticate, requireProjectAccess } = require("../middleware/auth");

const router = express.Router();

// GET /api/projects - list projects for current user
router.get("/", authenticate, (req, res) => {
  const db = getDb();
  let projects;
  if (req.user.role === "admin") {
    projects = db.prepare(`
      SELECT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      ORDER BY p.created_at DESC
    `).all();
  } else {
    projects = db.prepare(`
      SELECT p.*, u.name as owner_name, pm.role as my_role,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id);
  }
  res.json({ projects });
});

// POST /api/projects - create project
router.post("/", authenticate, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "Project name is required" });

  const db = getDb();
  const result = db
    .prepare("INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)")
    .run(name.trim(), description || null, req.user.id);

  // Add owner as admin member
  db.prepare("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'admin')")
    .run(result.lastInsertRowid, req.user.id);

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ project });
});

// GET /api/projects/:id
router.get("/:id", authenticate, requireProjectAccess, (req, res) => {
  const db = getDb();
  const project = db.prepare(`
    SELECT p.*, u.name as owner_name FROM projects p
    JOIN users u ON p.owner_id = u.id WHERE p.id = ?
  `).get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.role as global_role, pm.role as project_role, pm.joined_at
    FROM project_members pm JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
  `).all(req.params.id);

  res.json({ project, members });
});

// PUT /api/projects/:id
router.put("/:id", authenticate, requireProjectAccess, (req, res) => {
  const member = req.projectMember;
  if (member && member.role !== "admin" && req.user.role !== "admin")
    return res.status(403).json({ error: "Only project admins can edit projects" });

  const { name, description, status } = req.body;
  const db = getDb();
  db.prepare("UPDATE projects SET name = COALESCE(?, name), description = COALESCE(?, description), status = COALESCE(?, status) WHERE id = ?")
    .run(name || null, description || null, status || null, req.params.id);

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  res.json({ project });
});

// DELETE /api/projects/:id
router.delete("/:id", authenticate, requireProjectAccess, (req, res) => {
  const member = req.projectMember;
  if (member && member.role !== "admin" && req.user.role !== "admin")
    return res.status(403).json({ error: "Only project admins can delete projects" });

  const db = getDb();
  db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
  res.json({ message: "Project deleted" });
});

// POST /api/projects/:id/members - add member
router.post("/:projectId/members", authenticate, requireProjectAccess, (req, res) => {
  const member = req.projectMember;
  if (member && member.role !== "admin" && req.user.role !== "admin")
    return res.status(403).json({ error: "Only project admins can add members" });

  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const db = getDb();
  const user = db.prepare("SELECT id, name, email FROM users WHERE email = ?").get(email.toLowerCase());
  if (!user) return res.status(404).json({ error: "User not found" });

  const existing = db.prepare("SELECT id FROM project_members WHERE project_id = ? AND user_id = ?")
    .get(req.params.projectId, user.id);
  if (existing) return res.status(409).json({ error: "User is already a member" });

  db.prepare("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)")
    .run(req.params.projectId, user.id, role || "member");

  res.status(201).json({ message: "Member added", user });
});

// DELETE /api/projects/:projectId/members/:userId
router.delete("/:projectId/members/:userId", authenticate, requireProjectAccess, (req, res) => {
  const member = req.projectMember;
  if (member && member.role !== "admin" && req.user.role !== "admin")
    return res.status(403).json({ error: "Only project admins can remove members" });

  const db = getDb();
  db.prepare("DELETE FROM project_members WHERE project_id = ? AND user_id = ?")
    .run(req.params.projectId, req.params.userId);
  res.json({ message: "Member removed" });
});

module.exports = router;
