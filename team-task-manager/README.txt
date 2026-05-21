====================================================
  TASKFLOW — Team Task Manager
  Full-Stack Web Application
====================================================

LIVE URL: [Add your Railway URL after deployment]
GITHUB:   [Add your GitHub repo link]

----------------------------------------------------
PROJECT OVERVIEW
----------------------------------------------------
TaskFlow is a full-stack Team Task Manager built with:
- Backend:  Node.js + Express REST API
- Database: SQLite (via better-sqlite3, file-based, zero config)
- Frontend: React + Vite (SPA)
- Auth:     JWT-based authentication
- Deployment: Railway (monorepo, single service)

----------------------------------------------------
FEATURES
----------------------------------------------------
Authentication
  - Signup / Login with bcrypt-hashed passwords
  - JWT tokens (7-day expiry)
  - Two global roles: admin / member

Projects
  - Create, view, update, delete projects
  - Project-level membership with roles (admin/member)
  - Add/remove team members by email
  - View task progress bar per project

Tasks
  - Create, edit, delete tasks within projects
  - Status tracking: todo → in_progress → done
  - Priority levels: low / medium / high
  - Assign tasks to project members
  - Due dates with overdue detection

Dashboard
  - Personal stats: task counts by status, overdue count
  - Admin stats: all projects, all tasks, all users
  - Recent tasks list
  - Overdue tasks highlighted

Role-Based Access Control
  - Global admin: can view/manage all projects, tasks, users
  - Global member: can only access projects they're added to
  - Project admin: can edit project, add/remove members, reassign tasks
  - Project member: can create tasks, update their own tasks' status

----------------------------------------------------
API ENDPOINTS
----------------------------------------------------
Auth:
  POST   /api/auth/signup
  POST   /api/auth/login
  GET    /api/auth/me

Projects:
  GET    /api/projects
  POST   /api/projects
  GET    /api/projects/:id
  PUT    /api/projects/:id
  DELETE /api/projects/:id
  POST   /api/projects/:id/members
  DELETE /api/projects/:id/members/:userId

Tasks:
  GET    /api/projects/:projectId/tasks
  POST   /api/projects/:projectId/tasks
  GET    /api/projects/:projectId/tasks/:id
  PUT    /api/projects/:projectId/tasks/:id
  DELETE /api/projects/:projectId/tasks/:id

Dashboard & Users:
  GET    /api/dashboard
  GET    /api/users            (admin only)
  GET    /api/users/search?q=  (search by name/email)

Health:
  GET    /api/health

----------------------------------------------------
LOCAL SETUP
----------------------------------------------------
Prerequisites: Node.js >= 18

1. Clone the repository
   git clone <your-repo-url>
   cd team-task-manager

2. Install dependencies
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..

3. Configure backend environment
   cd backend
   cp .env.example .env
   # Edit .env: set JWT_SECRET to a strong random string

4. Run backend (port 5000)
   cd backend && npm run dev

5. Run frontend (port 5173)
   cd frontend && npm run dev

6. Open http://localhost:5173
   Create an account with role "admin" to access all features.

----------------------------------------------------
DEPLOYMENT ON RAILWAY
----------------------------------------------------
1. Push code to GitHub

2. Go to https://railway.app → New Project → Deploy from GitHub repo

3. Select your repository

4. In Railway dashboard, go to Variables and set:
   JWT_SECRET   = <a strong random 32+ char string>
   NODE_ENV     = production
   PORT         = 5000  (Railway sets this automatically too)

5. Railway will auto-detect railway.toml and run:
   Build:  npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend
   Start:  node backend/server.js

6. The app serves the React build as static files in production mode.
   Your live URL will be something like: https://your-app.up.railway.app

Note: SQLite database file persists on Railway's ephemeral disk.
For production persistence, mount a Railway Volume and set:
   DB_PATH = /data/taskflow.db
in your Railway Variables.

----------------------------------------------------
TECH STACK
----------------------------------------------------
backend/
  server.js            Express app entry point
  db/database.js       SQLite schema & connection
  middleware/auth.js   JWT auth + role middleware
  routes/auth.js       Signup, login, /me
  routes/projects.js   Project + member CRUD
  routes/tasks.js      Task CRUD
  routes/dashboard.js  Stats, users list

frontend/
  src/
    api.js             Axios instance with auth headers
    context/AuthContext.jsx  Global auth state
    pages/
      Login.jsx        Login form
      Signup.jsx       Signup form
      Dashboard.jsx    Stats + task overview
      Projects.jsx     Projects grid
      ProjectDetail.jsx Tasks kanban + members tab
      Users.jsx        Admin: all users table
    components/
      Layout.jsx       Sidebar navigation shell

----------------------------------------------------
VALIDATION & SECURITY
----------------------------------------------------
- Passwords hashed with bcrypt (10 rounds)
- JWT signed with secret, expires in 7 days
- Input validation on all endpoints
- Role checks at middleware and route level
- Foreign key constraints enforced in SQLite
- CORS configured for frontend origin

====================================================
