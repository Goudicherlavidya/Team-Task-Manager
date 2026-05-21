const jwt = require("jsonwebtoken");
const { getDb } = require("../db/database");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_in_prod";

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db.prepare("SELECT id, name, email, role FROM users WHERE id = ?").get(payload.userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

function requireProjectAccess(req, res, next) {
  const db = getDb();
  const projectId = req.params.projectId || req.params.id;
  const member = db
    .prepare("SELECT * FROM project_members WHERE project_id = ? AND user_id = ?")
    .get(projectId, req.user.id);
  if (!member && req.user.role !== "admin") {
    return res.status(403).json({ error: "No access to this project" });
  }
  req.projectMember = member;
  next();
}

module.exports = { authenticate, requireAdmin, requireProjectAccess, JWT_SECRET };
