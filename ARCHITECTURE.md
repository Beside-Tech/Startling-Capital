# Startling Capital - Architecture Deep Dive

This document provides detailed technical architecture information for developers working on the Startling Capital platform.

## Table of Contents
- [System Overview](#system-overview)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Database Design](#database-design)
- [API Design Patterns](#api-design-patterns)
- [Security Architecture](#security-architecture)
- [Performance Considerations](#performance-considerations)

---

## System Overview

### Technology Stack Summary

**Backend:**
- Runtime: Node.js v18+ with ES Modules
- Framework: Express.js v5
- Language: TypeScript
- Database: PostgreSQL (Neon)
- ORM: Drizzle ORM
- File Storage: Cloudinary
- Logging: Pino (high-performance JSON logger)
- Authentication: JWT + PIN-based

**Frontend:**
- Framework: React 18+ with Hooks
- Build: Vite (modern bundler)
- Routing: Wouter (lightweight router)
- State Management: React Context + React Query
- Forms: React Hook Form + Zod validation
- UI: Radix UI (headless components)
- Styling: Tailwind CSS
- HTTP Client: Auto-generated from OpenAPI

**Shared:**
- Package Manager: pnpm (workspaces)
- API Contract: OpenAPI 3.0 with Orval codegen
- Schema Validation: Zod (TypeScript-first)

---

## Backend Architecture

### Directory Structure

```
artifacts/api-server/
├── src/
│   ├── index.ts              # Server entry point
│   ├── app.ts                # Express app setup
│   ├── lib/
│   │   ├── auth.ts           # Authentication utilities
│   │   ├── logger.ts         # Pino logger instance
│   │   ├── email.ts          # Nodemailer integration
│   │   ├── objectStorage.ts  # Cloudinary integration
│   │   ├── objectAcl.ts      # File access control
│   │   ├── seed-defaults.ts  # Database seeding
│   │   └── seed-superadmin.ts
│   ├── middlewares/          # Express middlewares
│   ├── routes/               # 42+ route modules
│   │   ├── index.ts          # Route aggregation
│   │   ├── auth.ts           # Authentication routes
│   │   ├── admin*.ts         # Admin features (8 files)
│   │   ├── founder*.ts       # Founder features (8 files)
│   │   ├── ic*.ts            # Investment committee (3 files)
│   │   ├── lp*.ts            # Limited partner (2 files)
│   │   ├── ventures.ts       # Portfolio companies
│   │   ├── funds.ts          # Fund management
│   │   ├── cap-table.ts      # Cap table
│   │   ├── scoring/*         # Evaluation system
│   │   ├── export.ts         # Excel exports
│   │   └── [... other routes]
│   └── uploads/              # Uploaded files (temporary)
├── build.mjs                 # esbuild configuration
├── package.json
└── tsconfig.json
```

### Request Handling Pipeline

```
HTTP Request
    ↓
Express Middleware Stack:
  1. cors() - Cross-origin handling
  2. json() - Parse JSON body
  3. cookieParser() - Parse cookies
  4. Pino HTTP logger - Request logging
    ↓
Route Matching
    ↓
Authentication Check (requireAuth middleware)
  - Verify JWT token
  - Extract userId, role
  - Attach req.user
    ↓
Authorization Check (requireAdmin, etc.)
  - Check role permissions
  - Return 403 if unauthorized
    ↓
Route Handler
  - Validate input (Zod schemas)
  - Query database (Drizzle ORM)
  - Process business logic
  - Interact with external services (Cloudinary)
    ↓
Response
  - JSON response with data
  - Error handling (status codes)
  - Logging via Pino
```

### Authentication Flow (Detailed)

```
1. Login Request
   POST /auth/login { email, pin }
   ↓
2. PIN Validation
   - Hash incoming PIN with bcryptjs
   - Compare with stored pinHash
   ↓
3. Token Generation
   - Generate JWT with payload: { userId, role, iat, exp }
   - Sign with JWT_SECRET
   - Set expiration to 24 hours (configurable)
   ↓
4. Token Response
   - Return { token, user: {userId, name, role} }
   - Client stores in memory (not localStorage for security)
   ↓
5. Authenticated Requests
   - Client sends: Authorization: Bearer {token}
   - Middleware: jwt.verify(token, JWT_SECRET)
   - Extract userId and role
   - Attach to req.user
   ↓
6. Role-Based Access Control
   - requireAdmin: role === 'Admin'
   - requireJudge: role === 'Judge'
   - requireFounder: role === 'Founder'
   - Custom authorization per route
```

### Database Connection

```
// Drizzle ORM Setup
const db = drizzle(
  postgres(process.env.DATABASE_URL), // Neon PostgreSQL
  { schema: * }
);

// Connection Pool
- Automatic connection pooling
- Neon provides serverless connections
- Connection limits: Check Neon tier
- SSL/TLS: Enabled by default

// Error Handling
- Database errors caught in route handlers
- Logged via Pino
- Returned to client as 500 errors (safe errors only)
```

### File Upload Architecture

```
Upload Request: POST /upload (multipart/form-data)
    ↓
Multer Middleware
  - Parse multipart form
  - Store file temporarily in memory/disk
    ↓
Validation
  - Check MIME type
  - Check file size limits
  - Virus scan (optional)
    ↓
Cloudinary Upload
  - CloudinarySDK.uploader.upload(buffer)
  - Return { public_id, secure_url, resource_type }
    ↓
ACL Check
  - Verify user permission to upload
  - Check if file should be public/private
    ↓
Database Storage
  - Store URL and metadata
  - Link to entity (founder profile, application, etc.)
    ↓
Response
  - Return { url, publicId, type }
```

---

## Frontend Architecture

### Component Hierarchy

```
<App /> (Router setup)
  ├── <AuthProvider />
  │   ├── <ThemeProvider />
  │   │   └── <QueryClientProvider />
  │   │       ├── <TooltipProvider />
  │   │       └── <Toaster />
  │   │           └── <Switch> (Wouter Router)
  │   │               ├── Public Routes
  │   │               │   ├── <Landing />
  │   │               │   ├── <Login />
  │   │               │   └── <Register />
  │   │               ├── Founder Routes
  │   │               │   ├── <FounderDashboard />
  │   │               │   ├── <FounderApply />
  │   │               │   └── [...]
  │   │               ├── Admin Routes
  │   │               │   ├── <AdminDashboard />
  │   │               │   ├── <AdminManage />
  │   │               │   └── [...]
  │   │               ├── IC Routes
  │   │               └── LP Routes
```

### State Management Strategy

**Global State (Context):**
- AuthContext - Current user, token, role
- ThemeContext - Dark/light mode
- ToastContext - Notification system (via Toaster)

**Server State (React Query):**
- useQuery for fetching data
- useMutation for POST/PUT/DELETE
- Automatic caching and invalidation
- Optimistic updates where applicable

**Local State (useState):**
- Form fields (via React Hook Form)
- UI state (modals, dropdowns, pagination)
- Loading/error states

### Form Handling Pattern

```
<Form>
  useForm() - Initialize React Hook Form
  useFormState() - Track dirty fields, errors
  
  <FormField> (Radix UI + React Hook Form)
    register() - Bind input to form state
    watch() - Subscribe to field changes
    formState.errors - Show validation errors
    
  <ZodResolver> - Validate against Zod schema
    Before submit: validate all fields
    Show field-level errors
    Prevent submit if invalid
    
  onSubmit
    useMutation() - Send to backend
    Optimistic update (optional)
    Show success/error toast
    Refetch related data
```

### Data Fetching Pattern

```
// Using generated API client hooks (from OpenAPI)
const { data: courses, isLoading, error } = useGetFounderCourses();

// Behind the scenes:
// 1. Hook created by Orval from OpenAPI spec
// 2. Uses React Query
// 3. Automatically attaches JWT token
// 4. Type-safe parameters and response
// 5. Handles error states
// 6. Implements retry logic
```

---

## Database Design

### Core Tables and Relationships

**User Management:**
```
users
  ├── id (PK)
  ├── email (unique)
  ├── name
  ├── role (Judge|Founder|Admin|LP|Sponsor)
  ├── pinHash (for PIN-based auth)
  ├── judgeId (FK → judges)
  ├── createdAt, updatedAt

founders
  ├── id (PK)
  ├── userId (FK → users, unique)
  ├── companyName
  ├── sector, stage
  ├── avatarUrl (Cloudinary)
  ├── onboardingComplete
  └── [profile fields]

judges
  ├── id (PK)
  ├── name
  ├── email
  ├── title
  ├── active
```

**Programs & Applications:**
```
programs
  ├── id (PK, string)
  ├── name
  ├── phase, format, location
  ├── applicationDeadline
  ├── eligibility, benefits
  ├── active

cohorts
  ├── id (PK, string)
  ├── programId (FK)
  ├── name
  ├── year
  ├── active

applications
  ├── id (PK)
  ├── founderId (FK → founders)
  ├── cohortId (FK → cohorts)
  ├── status (draft|submitted|reviewed|accepted|rejected|withdrawn)
  ├── answers (JSON - application form responses)
  ├── createdAt, updatedAt

startups
  ├── id (PK)
  ├── programId, cohortId
  ├── name
  ├── sector, stage
  ├── active
```

**Scoring System:**
```
judges
rubric_criteria
  ├── id (PK)
  ├── programId (or 'ALL')
  ├── name
  ├── category
  ├── active

advancement_rules
  ├── id (PK)
  ├── programId, cohortId
  ├── conditions (JSON)

judge_assignments
  ├── id (PK)
  ├── judgeId, programId, cohortId

scores
  ├── id (PK)
  ├── startupId (FK → startups)
  ├── judgeId (FK → judges)
  ├── criterionId (FK → rubric_criteria)
  ├── score (1-5)
  ├── weight
  ├── comment
```

**Curriculum:**
```
courses
  ├── id (PK)
  ├── title
  ├── type (video|workshop|reading|live_session)
  ├── durationMins
  ├── url, fileUrl
  ├── active

program_courses
  ├── id (PK)
  ├── programId, cohortId
  ├── courseId (FK)
  ├── required, displayOrder

founder_course_progress
  ├── id (PK)
  ├── founderId, courseId
  ├── status (not_started|in_progress|complete)
  ├── completedAt

founder_course_assignments
  ├── id (PK)
  ├── founderId, courseId
  ├── required
```

**Portfolio Management:**
```
funds
  ├── id (PK)
  ├── name
  ├── size, target
  ├── vintage

ventures
  ├── id (PK)
  ├── name
  ├── sector, stage
  ├── foundingDate

cap_table
  ├── id (PK)
  ├── ventureId (FK)
  ├── holderType (founder|investor|employee)
  ├── shares, percentage
  ├── vestingSchedule (optional)

lp_profiles
  ├── id (PK)
  ├── name
  ├── type (institution|individual|family_office)

lp_accounts
  ├── id (PK)
  ├── lpId (FK)
  ├── fundId (FK)
  ├── investmentAmount
```

**Supporting Tables:**
```
testimonials - Founder success stories
site_settings - Homepage & configuration data
traction - Founder metrics (MRR, users, etc.)
fund_metrics - Fund performance data
diligence_checklists - DD workflows
capital_calls - Fund capital calls to LPs
closing_workflows - Exit management
board_materials - Meeting documents
```

### Index Strategy

```
Primary Keys - All tables have id/uuid PK
Unique Indexes:
  - users(email)
  - founders(userId)
  - judges(email)

Foreign Key Indexes:
  - programs_id on cohorts
  - cohortId on applications
  - founderId on applications
  - judgeId on scores
  - courseId on program_courses

Query Optimization Indexes:
  - applications(cohortId, status)
  - applications(founderId, status)
  - scores(startupId, programId, cohortId)
  - courses(active)
  - testimonials(isActive, displayOrder)
```

---

## API Design Patterns

### RESTful Conventions

```
Resources:
  /admin/programs          - Program CRUD
  /admin/cohorts           - Cohort CRUD
  /admin/startups          - Startup CRUD
  /admin/judges            - Judge CRUD
  /founder/courses         - Founder course list
  /founder/profile         - Founder profile
  /admin/site-settings     - Settings management

Methods:
  GET    - Retrieve data
  POST   - Create resource
  PUT    - Update resource
  DELETE - Remove resource

Status Codes:
  200 - Success
  201 - Created
  400 - Bad Request (validation error)
  401 - Unauthorized (no token)
  403 - Forbidden (insufficient permissions)
  404 - Not Found
  409 - Conflict (duplicate entry)
  500 - Server Error
```

### Error Response Format

```
Success:
{
  "success": true,
  "data": { ... }
}

Error:
{
  "error": "ErrorCode|ErrorMessage",
  "message": "Human readable message",
  "details": { } // optional
}

Examples:
{
  "error": "BadRequest",
  "message": "email and pin are required"
}

{
  "error": "Unauthorized",
  "message": "Invalid credentials"
}

{
  "error": "NotFound",
  "message": "Judge not found"
}
```

### Query Parameters

```
Filtering:
  ?programId=xyz
  ?status=submitted
  ?active=true

Sorting:
  ?sortBy=createdAt&order=desc

Pagination:
  ?page=1&limit=20

Multiple filters (AND):
  ?programId=xyz&status=submitted&active=true
```

---

## Security Architecture

### Authentication & Authorization

```
Authentication (Verify Identity):
  1. Email + PIN login → JWT token
  2. JWT contains: {userId, role, iat, exp}
  3. Token expires in 24 hours
  4. Sent in Authorization header: "Bearer {token}"

Authorization (Verify Permissions):
  1. Check token validity
  2. Extract role from token
  3. Route-level permission checks:
     - requireAdmin: admin only
     - requireAuth: any authenticated user
     - Custom checks per route

Example:
  router.post("/admin/programs", requireAdmin, async (req, res) => {
    // Only admins can create programs
  });

  router.put("/founder/profile", requireAuth, async (req, res) => {
    // Any authenticated founder can update their profile
  });
```

### Data Security

```
Sensitive Fields:
  - Passwords: Hashed with bcryptjs (10 rounds)
  - PINs: Hashed with bcryptjs (never stored plain)
  - JWTs: Signed with JWT_SECRET (should be 32+ chars)
  - API Keys: Stored in .env, never in code

CORS Configuration:
  - Whitelist frontend domains
  - Allow credentials if needed
  - Restrict methods (GET, POST, PUT, DELETE)

HTTPS:
  - All production traffic over HTTPS
  - Vercel & Render enforce HTTPS
  - SSL certificates auto-managed

Database Security:
  - Neon connections use SSL/TLS
  - Connections stored in DATABASE_URL
  - Never log connection strings
```

### File Upload Security

```
Validation:
  1. Check file MIME type
  2. Check file size limits
  3. Scan for malicious content (optional)
  4. Verify user permissions

Cloudinary Configuration:
  - API key & secret in .env only
  - Enable signed URLs for private files
  - Set upload folder for organization
  - Restrict allowed file types

Access Control:
  - Public files: available to all
  - Private files: signed URLs with expiration
  - User-specific files: verify userId before serving
```

---

## Performance Considerations

### Database Optimization

```
Query Optimization:
  1. Use Drizzle ORM (avoids N+1 queries)
  2. Batch queries with Promise.all()
  3. Select specific columns (not *)
  4. Use indexes on frequently queried fields
  5. Paginate large result sets

Example - Avoid N+1:
  // Bad: N+1 queries
  const judges = await db.select().from(judgesTable);
  for (const judge of judges) {
    judge.assignments = await db.select()...
  }

  // Good: Single query with join
  const data = await db
    .select()
    .from(judgesTable)
    .leftJoin(judgeAssignmentsTable, eq(...));
```

### API Response Caching

```
Frontend Caching (React Query):
  - Automatic caching of GET requests
  - Cache invalidation on mutations
  - Stale-while-revalidate strategy
  - configurable through queryClient

Cache Headers:
  - Set appropriate Cache-Control headers
  - Public resources: 1 hour
  - Private resources: no-cache
```

### Frontend Performance

```
Code Splitting:
  - Vite automatically chunks routes
  - Lazy load route components
  - Only load needed UI libraries

Bundle Size:
  - Tree-shake unused code
  - Minimize dependencies
  - Use Tailwind CSS PurgeCSS

Image Optimization:
  - Serve via Cloudinary CDN
  - Use responsive image sizes
  - WebP format support
  - Lazy load images
```

### Monitoring & Observability

```
Backend Logging (Pino):
  - Structured JSON logs
  - Log levels: debug, info, warn, error
  - Request/response logging
  - Error stack traces
  - Set LOG_LEVEL via env var

Frontend Error Tracking:
  - Console errors captured
  - Failed API calls logged
  - User feedback integration
  - Consider Sentry integration

Performance Monitoring:
  - Database query performance
  - API response times
  - Frontend Core Web Vitals
  - Function execution time
```

---

## Deployment Architecture

### Frontend Deployment (Vercel)

```
Build Process:
  1. pnpm install (workspaces)
  2. pnpm --filter @workspace/score-sheet build
  3. Output: artifacts/score-sheet/dist

Deployment:
  - Auto-deploy from main branch
  - Preview URLs for PRs
  - Environment variables injected
  - SSL/HTTPS automatic
  - CDN distribution

Configuration:
  - vercel.json defines build & output
  - Rewrites for SPA routing
  - Custom headers for caching
```

### Backend Deployment (Render)

```
Build Process:
  1. pnpm install
  2. pnpm --filter @workspace/api-server build
  3. Outputs dist/index.mjs

Deployment:
  - Start command: node dist/index.mjs
  - Auto-restart on crash
  - Environment variables injected
  - SSL/HTTPS automatic
  - Logging to Render dashboard

Environment Variables:
  - DATABASE_URL (Neon connection)
  - CLOUDINARY_* (file storage)
  - JWT_SECRET (auth key)
  - NODE_ENV=production
  - All SMTP_* vars
  - All API keys
```

### Database (Neon PostgreSQL)

```
Provisioning:
  1. Create Neon project
  2. Get DATABASE_URL connection string
  3. Set in environment variables

Backup Strategy:
  - Automatic daily backups (Neon feature)
  - Manual snapshots before migrations
  - Point-in-time recovery available
  - Regular backup verification

Maintenance:
  - Monitor query performance
  - Vacuum tables periodically
  - Check storage usage
  - Review slow query logs
  - Update connection limits if needed
```

---

## Developer Workflow

### Local Development Setup

```bash
# 1. Clone and install
git clone <repo>
cd Asset-Manager
pnpm install

# 2. Create environment files
cp artifacts/api-server/.env.example artifacts/api-server/.env
# Edit with Neon, Cloudinary, JWT_SECRET

cp artifacts/score-sheet/.env.example artifacts/score-sheet/.env
# Set VITE_API_BASE_URL=http://localhost:5000

# 3. Run migrations (if needed)
cd lib/db
pnpm run db:migrate

# 4. Start development
cd artifacts/api-server && pnpm run dev  # Terminal 1
cd artifacts/score-sheet && pnpm run dev # Terminal 2

# 5. Access
# Frontend: http://localhost:5173
# Backend: http://localhost:5000
# API Docs: http://localhost:5000/docs (if Swagger enabled)
```

### Adding New Features

**Backend Feature:**
```
1. Add database table schema → lib/db/src/schema/
2. Export from → lib/db/src/schema/index.ts
3. Update OpenAPI spec → lib/api-spec/openapi.yaml
4. Add Zod schema → lib/api-zod/src/
5. Create route file → artifacts/api-server/src/routes/
6. Register route → artifacts/api-server/src/routes/index.ts
7. Regenerate API client → pnpm --filter @workspace/api-spec run codegen
```

**Frontend Feature:**
```
1. Create page component → artifacts/score-sheet/src/pages/
2. Add route in App.tsx → artifacts/score-sheet/src/App.tsx
3. Use API hooks (from generated client)
4. Add components if needed → artifacts/score-sheet/src/components/
5. Handle loading/error states
6. Add to navigation
```

---

## Testing Strategy (Future)

```
Unit Tests:
  - Backend: Jest for utilities, auth, validators
  - Frontend: Vitest for components, hooks

Integration Tests:
  - API route testing
  - Database transaction testing
  - File upload workflows

E2E Tests:
  - Playwright for user flows
  - Test critical paths:
    - User registration/login
    - Founder application
    - Admin scoring
    - Founder course completion

CI/CD:
  - Run tests on PR
  - Fail build if tests fail
  - Code coverage reporting
```

---

## Troubleshooting Guide

### Common Issues

**Database Connection Error:**
```
Error: "connect ENOTFOUND..."
Solution:
  1. Check DATABASE_URL is correct
  2. Verify Neon IP whitelisting
  3. Check network connectivity
  4. Try connection from client machine
```

**Cloudinary Upload Failure:**
```
Error: "invalid_api_key"
Solution:
  1. Verify CLOUDINARY_CLOUD_NAME
  2. Verify CLOUDINARY_API_KEY
  3. Verify CLOUDINARY_API_SECRET
  4. Check Neon bucket exists
  5. Check file size limits
```

**JWT Token Errors:**
```
Error: "JsonWebTokenError"
Solution:
  1. Verify JWT_SECRET matches
  2. Check token expiration
  3. Verify Authorization header format
  4. Check token hasn't been tampered
```

---

## References & Resources

- [Express.js Documentation](https://expressjs.com/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [React Documentation](https://react.dev/)
- [Neon PostgreSQL](https://neon.tech/docs/)
- [Cloudinary API](https://cloudinary.com/documentation/)
- [Vercel Deployment](https://vercel.com/docs)
- [Render.com Deployment](https://render.com/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
