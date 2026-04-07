# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Project: Nobellum Ventures VC Platform

### Artifacts
- `artifacts/api-server` — Express 5 REST API (port 8080), JWT auth, Drizzle ORM
- `artifacts/score-sheet` — React + Vite frontend (Nobellum Ventures web app)

### Demo Accounts (all roles)
| Role | Email | Password |
|------|-------|----------|
| SuperAdmin | team@nobellum.com | Nobellum2025! |
| Admin | admin@nobellum.com | Admin1234 |
| ManagingPartner | mp@nobellum.com | Partner1234 |
| IC | ic@nobellum.com | IC12341234 |
| Judge | judge@nobellum.com | Judge1234 |
| Founder | founder@nobellum.com | Founder1234 |
| LP | lp@nobellum.com | LP12341234 |

The login page has a collapsible "Demo Accounts" panel that pre-fills credentials on click.

### Key Schema Tables
- `users`, `founders`, `investments`, `deal_flow`, `ic_votes`
- `lp_profiles`, `programs`, `applications`, `scores`
- `capital_calls`, `capital_call_allocations` — MP capital call management
- `cap_table_entries` — per-founder equity/ownership tracking

### VC Management Features
- **Capital Calls** (MP): Create/manage LP capital calls, track payment status (`/mp/capital-calls`)
- **Capital Calls** (LP): View own capital call obligations (`/lp/capital-calls`)
- **Cap Table** (Admin/MP): Full cap table per startup (`/admin/cap-table`)
- **IC Meeting Packets**: Expandable deal packets with vote summary (`/ic/packets`)
- **Fund Metrics** (MP): Portfolio KPIs, stage/sector breakdown (`/mp/fund-metrics`)

### Environment Variables
- `JWT_SECRET` — shared env var (auto-generated on first setup)
- `SUPER_ADMIN_PIN` — shared env var (set to "773421")
- `DATABASE_URL` — injected by Replit PostgreSQL
