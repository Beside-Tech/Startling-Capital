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

## Project: Startling Capital Ventures VC Platform

### Artifacts
- `artifacts/api-server` — Express 5 REST API (port 8080), JWT auth, Drizzle ORM
- `artifacts/score-sheet` — React + Vite frontend (Startling Capital Ventures web app)

### Demo Accounts (all roles)
| Role | Email | Password |
|------|-------|----------|
| SuperAdmin | team@Startling Capital.com | Startling Capital2025! |
| Admin | admin@Startling Capital.com | Admin1234 |
| ManagingPartner | mp@Startling Capital.com | Partner1234 |
| IC | ic@Startling Capital.com | IC12341234 |
| Judge | judge@Startling Capital.com | Judge1234 |
| Founder | founder@Startling Capital.com | Founder1234 |
| LP | lp@Startling Capital.com | LP12341234 |

The login page has a collapsible "Demo Accounts" panel that pre-fills credentials on click.

### Key Schema Tables
- `users`, `founders`, `investments`, `deal_flow`, `ic_votes`
- `lp_profiles`, `programs`, `applications`, `scores`
- `capital_calls`, `capital_call_allocations` — MP capital call management
- `cap_table_entries` — per-founder equity/ownership tracking
- `closing_checklists`, `closing_checklist_items` — per-deal closing workflow
- `board_meetings`, `board_materials` — board meeting management
- `diligence_checklists`, `diligence_checklist_items` — per-deal due diligence
- `fund_metrics_snapshots` — point-in-time TVPI/DPI/RVPI/IRR snapshots per fund

### Deal Pipeline State Machine
Canonical stages (new): `sourced → interested → due_diligence → ready_for_ic → ic_approved/ic_rejected → closing → invested` (terminal: `passed`, `deal_dead`)
Legacy stages (backward compat): `screening`, `ic_review`, `term_sheet`, `closed`
- Advance via `PATCH /api/deals/:id/stage` with `{ toStage }` — enforces VALID_TRANSITIONS
- `PUT /ic/deals/:id` rejects any body containing `pipelineStage` (bypass locked)
- IC votes auto-advance `ready_for_ic` → `ic_approved` or `ic_rejected` on majority (≥2 votes)

### VC Management Features
- **Capital Calls** (MP): Create/manage LP capital calls, pro-rata allocation engine (`/mp/capital-calls`)
- **Capital Calls** (LP): View own capital call obligations (`/lp/capital-calls`)
- **Cap Table** (Admin/MP): Full cap table per startup (`/admin/cap-table`)
- **IC Meeting Packets**: Expandable deal packets with vote summary (`/ic/packets`)
- **Closing Workflows**: Per-deal closing checklists with default 8-item template (`/closing/checklists`)
- **Board Materials**: Board meeting creation and material uploads (`/board/meetings`, `/board/materials`)
- **Diligence Checklists**: Per-deal due diligence item tracking by category (`/diligence/checklists`)
- **Fund Metrics Snapshots**: TVPI/DPI/RVPI/IRR recording per fund per quarter (`/mp/funds/:id/metrics`)
- **LP Portal**: Fund summary with commitment/called capital, K-1 download link, quarterly updates

### OpenAPI / Codegen
- Spec lives at `lib/api-spec/openapi.yaml` (NOT `artifacts/api-server/openapi.yaml`)
- Run codegen: `cd lib/api-spec && pnpm codegen`
- Generated clients in `lib/api-spec/src/generated/`

### Environment Variables
- `JWT_SECRET` — shared env var (auto-generated on first setup)
- `SUPER_ADMIN_PIN` — shared env var (set to "773421")
- `DATABASE_URL` — injected by Replit PostgreSQL

