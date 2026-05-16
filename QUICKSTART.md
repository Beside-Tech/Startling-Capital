# Quick Start Guide for Developers

Welcome to Startling Capital! This guide will get you up and running quickly.

## 5-Minute Setup

### Prerequisites
- Node.js v18+ (check: `node --version`)
- pnpm v9+ (install: `npm install -g pnpm`)
- Git
- A code editor (VS Code recommended)

### Step 1: Clone & Install
```bash
git clone https://github.com/your-org/asset-manager.git
cd Asset-Manager
pnpm install  # Installs all workspaces
```

### Step 2: Environment Setup
Create two `.env` files:

**`artifacts/api-server/.env`**
```env
DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your-random-secret-key-at-least-32-chars
NODE_ENV=development
PORT=5000
VITE_API_BASE_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

**`artifacts/score-sheet/.env`**
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_ENVIRONMENT=development
```

Get credentials from:
- **Neon**: https://neon.tech (PostgreSQL database)
- **Cloudinary**: https://cloudinary.com (file storage)
- **Gmail App Password**: https://myaccount.google.com/apppasswords

### Step 3: Start Development Servers
**Terminal 1 - Backend:**
```bash
cd artifacts/api-server
pnpm run dev
```
Backend should be running on `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd artifacts/score-sheet
pnpm run dev
```
Frontend should be running on `http://localhost:5173`

### Step 4: Open in Browser
Visit: `http://localhost:5173`

Login with a test account (contact admin for credentials)

---

## Project Structure at a Glance

```
Asset-Manager/
├── README.md              ← Main documentation
├── ARCHITECTURE.md        ← Technical deep dive
├── lib/                   ← Shared code
│   ├── db/               ← Database schema (Drizzle ORM)
│   ├── api-spec/         ← OpenAPI specification
│   ├── api-zod/          ← Validation schemas
│   ├── api-client-react/ ← Auto-generated API client
│   └── object-storage-web/ ← Upload utilities
├── artifacts/
│   ├── api-server/       ← Backend (Express)
│   │   ├── src/
│   │   │   ├── index.ts              ← Start here
│   │   │   ├── lib/auth.ts           ← Authentication
│   │   │   └── routes/               ← 42+ API endpoints
│   │   └── .env                      ← Config (create it)
│   └── score-sheet/      ← Frontend (React)
│       ├── src/
│       │   ├── main.tsx              ← Start here
│       │   ├── App.tsx               ← Routes
│       │   ├── pages/                ← Pages for each role
│       │   ├── components/           ← Reusable components
│       │   └── lib/                  ← Utilities
│       └── .env                      ← Config (create it)
└── scripts/              ← Utility scripts
```

---

## Common Tasks

### View TypeScript Errors
```bash
pnpm run typecheck
```

### Rebuild Everything
```bash
pnpm run build
```

### Add a New NPM Package
```bash
pnpm add package-name
```

### Format Code
```bash
pnpm run prettier --write .
```

---

## Understanding the Architecture

### Three Main Components:

1. **Frontend** (`artifacts/score-sheet/`) - React app users see
   - Pages for different roles (Admin, Founder, IC, LP)
   - Components built with Radix UI + Tailwind
   - Uses auto-generated API client

2. **Backend** (`artifacts/api-server/`) - Express.js API
   - 42+ route files (routes/)
   - Database access via Drizzle ORM
   - File uploads to Cloudinary
   - Authentication via JWT + PIN

3. **Database** (Neon PostgreSQL) - Data storage
   - 35+ tables defined in `lib/db/src/schema/`
   - Schema managed with Drizzle ORM migrations
   - Accessed from backend routes

### How They Connect:

```
Browser
   ↓
React Frontend (Port 5173)
   ↓ (HTTPS API calls)
Express Backend (Port 5000)
   ↓ (Queries)
PostgreSQL Database (Neon)
   ↓ (File uploads)
Cloudinary (CDN)
```

---

## Key Concepts

### Authentication
- Users login with **email + PIN**
- Backend generates **JWT token** (24 hour expiry)
- Frontend stores token in memory (not localStorage)
- Token sent in `Authorization: Bearer {token}` header
- **Roles**: Admin, Founder, Judge (IC), LP, Sponsor

### Database Access
- Use **Drizzle ORM** (strongly typed SQL)
- Query examples in route files
- Never run raw SQL queries directly
- Always include error handling

### File Uploads
- Users upload files to **Cloudinary**
- Automatic image optimization
- Global CDN delivery
- Access controlled via ACL system

### API Design
- 42+ route modules organized by feature
- RESTful conventions (GET/POST/PUT/DELETE)
- All responses are JSON
- Error responses include error code + message
- Input validation with Zod schemas

---

## Making Your First Change

### Scenario: Add a new field to Founder profile

**Step 1: Update Database Schema**
```typescript
// lib/db/src/schema/founders.ts
export const foundersTable = pgTable('founders', {
  // ... existing fields
  expertise: text(),  // NEW FIELD
  mentorshipAvailable: boolean().default(false), // NEW FIELD
});
```

**Step 2: Update API Endpoint**
```typescript
// artifacts/api-server/src/routes/founder-extras.ts
// In PUT /founder/profile handler:
if (expertise !== undefined) updates.expertise = expertise;
if (typeof mentorshipAvailable === 'boolean') 
  updates.mentorshipAvailable = mentorshipAvailable;
```

**Step 3: Update OpenAPI Spec**
```yaml
# lib/api-spec/openapi.yaml
FounderProfile:
  properties:
    expertise:
      type: string
    mentorshipAvailable:
      type: boolean
```

**Step 4: Regenerate API Client**
```bash
pnpm --filter @workspace/api-spec run codegen
```

**Step 5: Use in Frontend**
```typescript
// artifacts/score-sheet/src/pages/founder/profile.tsx
const { mutate: updateProfile } = useUpdateFounderProfile();

updateProfile({
  expertise: formData.expertise,
  mentorshipAvailable: formData.mentorshipAvailable,
});
```

---

## Testing Your Changes

### TypeScript Checking
```bash
pnpm run typecheck
```
Catches all type errors before running code.

### Running Locally
1. Make your changes
2. Backend automatically reloads (dev mode watches files)
3. Frontend automatically reloads (Vite HMR)
4. Test in browser

### Manual Testing Checklist
- [ ] Feature works on desktop
- [ ] Feature works on mobile (responsive)
- [ ] Dark mode compatible
- [ ] Error cases handled
- [ ] Loading states shown
- [ ] TypeScript has no errors

---

## Debugging Tips

### View Backend Logs
Check the terminal where you ran `pnpm run dev` for the api-server.
Logs show:
- Incoming API requests
- Database queries
- Errors with stack traces

### View Frontend Console
Open browser DevTools (F12)
- Console tab: TypeScript errors, debug logs
- Network tab: API requests/responses
- Storage tab: Auth token

### Check Database
Access Neon dashboard at https://console.neon.tech
- View tables
- Run SQL queries
- Check data directly

### API Testing
Use Postman or VS Code REST Client:
```rest
POST http://localhost:5000/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "pin": "123456"
}
```

---

## Folder Navigation Reference

### Adding a New Backend Route
→ `artifacts/api-server/src/routes/{feature}.ts`
→ Register in `artifacts/api-server/src/routes/index.ts`

### Adding a New Frontend Page
→ `artifacts/score-sheet/src/pages/{role}/{page}.tsx`
→ Add route in `artifacts/score-sheet/src/App.tsx`

### Adding a New Database Table
→ `lib/db/src/schema/{feature}.ts`
→ Export in `lib/db/src/schema/index.ts`

### Adding a Reusable Component
→ `artifacts/score-sheet/src/components/{category}/{name}.tsx`

### Adding Shared Utilities
→ `artifacts/score-sheet/src/lib/{feature}.ts` (frontend)
→ `artifacts/api-server/src/lib/{feature}.ts` (backend)

---

## Important Files to Know

| File | Purpose |
|------|---------|
| `package.json` | Root workspace config |
| `artifacts/api-server/src/index.ts` | Backend entry point |
| `artifacts/score-sheet/src/main.tsx` | Frontend entry point |
| `artifacts/api-server/src/app.ts` | Express middleware setup |
| `artifacts/score-sheet/src/App.tsx` | React routing |
| `lib/db/src/schema/index.ts` | Database exports |
| `artifacts/api-server/src/routes/index.ts` | Route aggregation |
| `artifacts/api-server/src/lib/auth.ts` | JWT + PIN auth |
| `artifacts/score-sheet/src/lib/auth.tsx` | React auth context |

---

## Getting Help

### Stuck?
1. Check [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
2. Check [README.md](README.md) for project overview
3. Look at similar existing features
4. Ask team in Slack/Discord

### Common Errors

**"Cannot find module '@workspace/db'"**
- Run `pnpm install` in root
- Check import path spelling

**"DATABASE_URL is not defined"**
- Create `.env` file in `artifacts/api-server/`
- Restart dev server after adding env vars

**"CORS error in browser"**
- Make sure backend is running on port 5000
- Check `VITE_API_BASE_URL` in frontend `.env`

**"Port already in use"**
```bash
# Find and kill process using port 5000
lsof -ti:5000 | xargs kill -9
```

---

## Next Steps

1. ✅ Get the project running locally
2. 📖 Read [ARCHITECTURE.md](ARCHITECTURE.md)
3. 🔍 Explore the codebase:
   - Look at a few route files
   - Check the database schema
   - Review a page component
4. 💡 Make a small change to practice:
   - Add a field
   - Add a validation rule
   - Style a component
5. 🚀 Ready to contribute!

---

## Useful Links

- **Neon Docs**: https://neon.tech/docs
- **Drizzle ORM**: https://orm.drizzle.team
- **Express.js**: https://expressjs.com
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com
- **Radix UI**: https://www.radix-ui.com
- **Vercel**: https://vercel.com/docs
- **Render**: https://render.com/docs

---

Happy coding! 🚀
