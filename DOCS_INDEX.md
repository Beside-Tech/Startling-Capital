# Documentation Index

Complete documentation for the Startling Capital platform. Start here to navigate all available resources.

## 📚 Documentation Files

### 1. **[README.md](README.md)** - Main Project Documentation
**Best for:** Project overview, getting started, tech stack, deployment

**Includes:**
- ✅ Project overview & features
- ✅ Tech stack details
- ✅ System architecture diagram
- ✅ Installation & setup instructions
- ✅ Environment variables configuration
- ✅ Running locally
- ✅ Project structure explanation
- ✅ Database overview (Neon)
- ✅ File storage (Cloudinary)
- ✅ Deployment instructions (Vercel & Render)
- ✅ Development workflow
- ✅ Troubleshooting

### 2. **[QUICKSTART.md](QUICKSTART.md)** - New Developer Quick Start
**Best for:** Getting up and running in 5 minutes, first contribution

**Includes:**
- ✅ 5-minute setup steps
- ✅ Environment configuration
- ✅ Running dev servers
- ✅ Project structure overview
- ✅ Common tasks & commands
- ✅ Key concepts explained
- ✅ First change walkthrough
- ✅ Debugging tips
- ✅ Common errors & solutions

### 3. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical Deep Dive
**Best for:** Understanding system design, technical decisions, security

**Includes:**
- ✅ System architecture & tech stack
- ✅ Backend architecture & request pipeline
- ✅ Authentication flow (detailed)
- ✅ Database connection setup
- ✅ File upload architecture
- ✅ Frontend component hierarchy
- ✅ State management strategy
- ✅ Form handling patterns
- ✅ Database schema relationships (detailed)
- ✅ API design patterns
- ✅ Security architecture
- ✅ Performance considerations
- ✅ Deployment architecture
- ✅ Development workflows
- ✅ Testing strategy
- ✅ Troubleshooting guide

### 4. **[ROADMAP.md](ROADMAP.md)** - Feature & Enhancement Roadmap
**Best for:** Understanding planned features and priorities

---

## 🎯 Quick Navigation by Role

### For New Developers
1. Start with [QUICKSTART.md](QUICKSTART.md)
2. Set up environment (5 minutes)
3. Run locally & explore code
4. Read [ARCHITECTURE.md](ARCHITECTURE.md) for deep understanding
5. Make your first contribution

### For Backend Developers
1. [README.md](README.md#backend) - Backend tech stack
2. [ARCHITECTURE.md](ARCHITECTURE.md#backend-architecture) - Backend architecture
3. [ARCHITECTURE.md](ARCHITECTURE.md#database-design) - Database design
4. `artifacts/api-server/src/routes/` - Browse existing endpoints
5. `lib/db/src/schema/` - Understand data models

### For Frontend Developers
1. [README.md](README.md#frontend-architecture) - Frontend tech stack
2. [ARCHITECTURE.md](ARCHITECTURE.md#frontend-architecture) - Frontend architecture
3. `artifacts/score-sheet/src/pages/` - Browse existing pages
4. `artifacts/score-sheet/src/components/` - Browse components
5. [ARCHITECTURE.md](ARCHITECTURE.md#form-handling-pattern) - Form patterns

### For DevOps/Deployment
1. [README.md](README.md#-deployment) - Deployment overview
2. [ARCHITECTURE.md](ARCHITECTURE.md#deployment-architecture) - Deployment details
3. `vercel.json` - Frontend deployment config
4. `artifacts/api-server/build.mjs` - Backend build config
5. Environment variables section in [README.md](README.md#-environment-variables)

### For Product Managers
1. [README.md](README.md#-project-overview) - Project overview
2. [README.md](README.md#-project-structure) - Feature organization
3. [README.md](README.md#-key-feature) - Key features explained
4. [ROADMAP.md](ROADMAP.md) - Planned features (when available)

---

## 📊 Feature Documentation

### Scoring & Evaluation System
- **Overview**: [README.md#key-feature-scoring--advancement](README.md#-key-feature-scoring--advancement)
- **Technical**: [ARCHITECTURE.md](ARCHITECTURE.md#database-design) - See `scores`, `rubric_criteria`, `advancement_rules` tables
- **Key Files**:
  - Backend: `artifacts/api-server/src/routes/scores.ts`
  - Export: `artifacts/api-server/src/routes/export.ts` (Excel reports)
  - Database: `lib/db/src/schema/scores.ts`

### Curriculum & Learning Paths
- **Overview**: [README.md#key-feature-curriculum--learning-paths](README.md#-key-feature-curriculum--learning-paths)
- **Technical**: [ARCHITECTURE.md](ARCHITECTURE.md#database-design) - See `courses`, `program_courses`, `founder_course_progress` tables
- **Key Files**:
  - Admin: `artifacts/api-server/src/routes/admin-curriculum.ts`
  - Founder: `artifacts/api-server/src/routes/founder-courses.ts`
  - Database: `lib/db/src/schema/curriculum.ts`

### File Upload & Storage
- **Overview**: [README.md#-file-storage](README.md#-file-storage)
- **Technical**: [README.md#-key-feature-file-upload--storage-flow](README.md#-key-feature-file-upload--storage-flow)
- **Key Files**:
  - Routes: `artifacts/api-server/src/routes/upload.ts`
  - Storage: `artifacts/api-server/src/lib/objectStorage.ts`
  - ACL: `artifacts/api-server/src/lib/objectAcl.ts`
  - React Hook: `lib/object-storage-web/src/use-upload.ts`

### Authentication & Authorization
- **Technical**: [README.md#-authentication--authorization-flow](README.md#-authentication--authorization-flow)
- **Deep Dive**: [ARCHITECTURE.md](ARCHITECTURE.md#authentication--authorization)
- **Key Files**:
  - Backend: `artifacts/api-server/src/lib/auth.ts` (JWT, PIN hashing)
  - Frontend: `artifacts/score-sheet/src/lib/auth.tsx` (Auth context)

### Email & Communication
- **Overview**: [README.md#-key-feature-email--communication-system](README.md#-key-feature-email--communication-system)
- **Key Files**:
  - Backend: `artifacts/api-server/src/lib/email.ts`
  - Configuration: `.env` variables (SMTP_HOST, SMTP_USER, SMTP_PASS)

### Portfolio Management
- **Key Files**:
  - Database: `lib/db/src/schema/cap_table.ts`, `ventures.ts`, `funds.ts`
  - Routes: `artifacts/api-server/src/routes/cap-table.ts`, `ventures.ts`, `funds.ts`

---

## 🗄️ Database Tables Reference

Complete database schema documented with relationships:

### Core Tables (Authentication & Identity)
- `users` - System users (email, role, PIN hash)
- `founders` - Founder profiles (company, sector, stage)
- `judges` - Judge profiles for evaluation
- `lp_profiles` - Limited partner profiles

### Program Management
- `programs` - Accelerator/incubator programs
- `cohorts` - Program batches
- `applications` - Founder program applications
- `startups` - Companies/startups being evaluated

### Evaluation & Scoring
- `scores` - Individual judge scores
- `rubric_criteria` - Evaluation criteria
- `advancement_rules` - Advancement logic
- `judge_assignments` - Judge to program assignments

### Curriculum & Training
- `courses` - Training courses/workshops
- `program_courses` - Cohort course assignments
- `founder_course_progress` - Founder course completion tracking
- `founder_course_assignments` - Individual course assignments

### Portfolio & Financials
- `ventures` - Portfolio companies
- `funds` - VC funds
- `cap_table` - Ownership/equity records
- `lp_accounts` - LP fund investments
- `capital_calls` - Fund capital calls

### Content & Communication
- `testimonials` - Founder success stories
- `traction` - Founder growth metrics
- `board_materials` - Board meeting documents
- `site_settings` - Configuration/homepage settings

### Operations
- `diligence_checklists` - Due diligence workflows
- `diligence_qa` - DD questionnaire items
- `closing_workflows` - Exit/closing management
- `fund_metrics` - Fund performance metrics

See [ARCHITECTURE.md#database-design](ARCHITECTURE.md#database-design) for full ER diagram and relationships.

---

## 🔗 API Routes Directory

### Core Routes (6 files)
- `health.ts` - System health checks
- `auth.ts` - Authentication endpoints
- `config.ts` - Configuration endpoints
- `storage.ts` - File storage info
- `upload.ts` - File upload handling
- `public-api.ts` - Public endpoints (no auth)

### Admin Routes (8 files)
- `admin.ts` - Program/cohort/startup CRUD
- `admin-users.ts` - User management
- `admin-extras.ts` - Settings, founders export, testimonials
- `admin-curriculum.ts` - Courses, assignments, progress
- `admin-traction.ts` - Traction metrics
- `admin-ventures.ts` - Portfolio management
- `admin-applications.ts` - Application management
- Additional: Various admin-specific features

### Founder Routes (8 files)
- `founder-applications.ts` - Apply to programs
- `founder-courses.ts` - Learning path & progress
- `founder-dataroom.ts` - Document management
- `founder-extras.ts` - Testimonials & profile
- `founder-qa.ts` - Q&A section
- `founder-advisory.ts` - Advisory network
- `founder-asks.ts` - Founder requests/needs
- `founder-traction.ts` - Growth tracking

### VC Routes (5 files)
- `funds.ts` - Fund management
- `ventures.ts` - Portfolio companies
- `cap-table.ts` - Cap table management
- `fund-metrics.ts` - Performance metrics
- `ventures-vc.ts` - VC-specific features

### IC (Investment Committee) Routes (3 files)
- `ic.ts` - IC dashboard & operations
- `ic-meetings.ts` - Meeting management
- `ic-votes-v2.ts` - Voting system

### LP Routes (2 files)
- `lp-portal.ts` - LP portal access
- `lp-accounts.ts` - LP account management

### Other Important Routes (8 files)
- `scores.ts` - Scoring endpoints
- `diligence.ts` - Due diligence workflows
- `diligence-checklists.ts` - DD checklist management
- `capital-calls.ts` - Capital call management
- `closing.ts` - Exit/closing processes
- `board-materials.ts` - Board documents
- `export.ts` - Excel export functionality
- Plus more specialized routes

See [README.md#-api-routes-structure](README.md#-api-routes-structure) for visual diagram.

---

## 🚀 Development Workflows

### Setting Up for Development
See [QUICKSTART.md#5-minute-setup](QUICKSTART.md#5-minute-setup)

### Making Your First Change
See [QUICKSTART.md#making-your-first-change](QUICKSTART.md#making-your-first-change)

### Adding a Backend Route
See [ARCHITECTURE.md#adding-new-features](ARCHITECTURE.md#developer-workflow)

### Adding a Frontend Page
See [ARCHITECTURE.md#adding-new-features](ARCHITECTURE.md#developer-workflow)

### Adding a Database Table
See [ARCHITECTURE.md#adding-new-features](ARCHITECTURE.md#developer-workflow)

---

## 🔐 Security & Configuration

### Environment Variables
**Backend** (`artifacts/api-server/.env`):
- `DATABASE_URL` - Neon PostgreSQL connection
- `CLOUDINARY_*` - File storage credentials
- `JWT_SECRET` - JWT signing key
- `SMTP_*` - Email configuration
- `NODE_ENV` - Environment (development/production)

**Frontend** (`artifacts/score-sheet/.env`):
- `VITE_API_BASE_URL` - Backend API URL

See [README.md#-environment-variables](README.md#-environment-variables) for complete list.

### Security Considerations
See [ARCHITECTURE.md#security-architecture](ARCHITECTURE.md#security-architecture)

### Authentication Flow
See [README.md#-authentication--authorization-flow](README.md#-authentication--authorization-flow)

---

## 🌐 Deployment

### Frontend Deployment (Vercel)
See [README.md#frontend---vercel](README.md#frontend---vercel)

### Backend Deployment (Render)
See [README.md#backend-api---render](README.md#backend-api---render)

### Deployment Architecture
See [ARCHITECTURE.md#deployment-architecture](ARCHITECTURE.md#deployment-architecture)

---

## 🆘 Troubleshooting

### Common Issues & Solutions
- [QUICKSTART.md#common-errors](QUICKSTART.md#common-errors)
- [README.md#-troubleshooting](README.md#-troubleshooting)
- [ARCHITECTURE.md#troubleshooting-guide](ARCHITECTURE.md#troubleshooting-guide)

### Debugging Tips
See [QUICKSTART.md#debugging-tips](QUICKSTART.md#debugging-tips)

---

## 📖 How to Use This Documentation

1. **First time?** → Start with [QUICKSTART.md](QUICKSTART.md)
2. **Need overview?** → Read [README.md](README.md)
3. **Diving deep?** → Study [ARCHITECTURE.md](ARCHITECTURE.md)
4. **Looking for something specific?** → Use this index to find the right doc
5. **Need code examples?** → Check key file references in relevant sections

---

## 📝 Documentation Maintenance

This documentation is maintained alongside the codebase. When making changes:

1. **Update related docs** when adding/changing features
2. **Keep diagrams current** in [README.md](README.md)
3. **Update ARCHITECTURE.md** for significant changes
4. **Update QUICKSTART.md** if setup steps change
5. **Test instructions** before committing

---

## 🔗 External Resources

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Neon Database](https://neon.tech/docs/)
- [Cloudinary API](https://cloudinary.com/documentation/)
- [Vercel Deployment](https://vercel.com/docs)
- [Render Deployment](https://render.com/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)

---

## 📞 Support

For questions or issues:
1. Check the relevant documentation
2. Search existing issues/discussions
3. Ask the team

Last Updated: May 16, 2026
