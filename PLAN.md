# Engineering Controls Submittal System — Implementation Plan

## Overview

Replace the current Excel (XLSM) + LaTeX macro system with a modern React/Node web application that manages a master parts library, generates project BOMs, and produces engineering controls submittals as both PDF and Excel deliverables.

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React + TypeScript | Requested; strong ecosystem for data-heavy UIs |
| UI Components | Ant Design (antd) | Tables, forms, filters — built for admin/data apps |
| Backend | Node.js + Express + TypeScript | Matches frontend language; simple REST API |
| Database | PostgreSQL | Scales from single-user to team; strong relational model for parts data |
| ORM | Prisma | Type-safe queries, easy migrations, works great with TypeScript |
| PDF Generation | Puppeteer (HTML → PDF) | Replaces LaTeX; full control over layout, cover pages, TOC |
| Excel Generation | ExcelJS | Native .xlsx output with formatting, multiple sheets |
| File Storage | Local disk (S3-compatible later) | Cut sheet PDFs uploaded and linked to parts |
| Auth | Simple JWT (expandable) | Start single-user, add team auth later |

---

## Database Schema

Derived directly from your 51-sheet Excel workbook. Normalized to eliminate the duplication across sheets.

### Core Tables

```
┌─────────────────────────────────────────────────────────────────┐
│ vendors                                                         │
├─────────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                                │
│ company_name    VARCHAR NOT NULL UNIQUE                         │
│ multiplier      DECIMAL(5,4)                                    │
│ contact_name    VARCHAR            -- Attention Line 1          │
│ contact_email   VARCHAR            -- Attention Line 2          │
│ address_line1   VARCHAR                                         │
│ address_line2   VARCHAR                                         │
│ phone           VARCHAR                                         │
│ netsuite_id     VARCHAR            -- from Vendor NS# sheet     │
│ created_at      TIMESTAMP                                       │
│ updated_at      TIMESTAMP                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ manufacturers                                                   │
├─────────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                                │
│ name            VARCHAR NOT NULL UNIQUE                         │
│ created_at      TIMESTAMP                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ part_categories (replaces "Point Type" / Types View)            │
├─────────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                                │
│ name            VARCHAR NOT NULL UNIQUE                         │
│   Examples: "Field Peripheral Devices", "Panel Components",     │
│   "Programmable Controllers", "Workstation Components",         │
│   "Wiring", "Valve Actuator", "Damper Actuator",               │
│   "Delta Controls", "Reliable Controls", "VFD"                 │
│ sort_order      INTEGER                                         │
│ created_at      TIMESTAMP                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ parts (replaces Master Parts List — 7,011 rows)                 │
├─────────────────────────────────────────────────────────────────┤
│ id                  UUID PRIMARY KEY                            │
│ description         VARCHAR NOT NULL                            │
│ model               VARCHAR NOT NULL                            │
│ manufacturer_id     UUID FK → manufacturers                     │
│ vendor_id           UUID FK → vendors                           │
│ category_id         UUID FK → part_categories                   │
│ point_type          VARCHAR          -- "Space Temperature" etc  │
│ list_price          DECIMAL(12,2)                               │
│ discount_price      DECIMAL(12,2)                               │
│ pricing_date        DATE                                        │
│ submittal_name      VARCHAR          -- display name for submittals │
│ priority_ranking    INTEGER          -- controls sort order     │
│ spec_section        VARCHAR          -- e.g. "2.8.E, 2.13.B"   │
│ is_by_others        BOOLEAN DEFAULT FALSE                       │
│ created_at          TIMESTAMP                                   │
│ updated_at          TIMESTAMP                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ part_documents (cut sheets, IOMs, PICS — uploaded PDFs)         │
├─────────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                                │
│ part_id         UUID FK → parts                                 │
│ doc_type        ENUM('cut_sheet', 'iom', 'pics')                │
│ file_name       VARCHAR NOT NULL                                │
│ file_path       VARCHAR NOT NULL    -- storage path             │
│ file_size       INTEGER                                         │
│ uploaded_at     TIMESTAMP                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Project & BOM Tables

```
┌─────────────────────────────────────────────────────────────────┐
│ projects                                                        │
├─────────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                                │
│ job_name        VARCHAR NOT NULL                                │
│ job_number      VARCHAR                                         │
│ submittal_date  DATE                                            │
│ status          ENUM('draft','submitted','approved','revised')  │
│ created_at      TIMESTAMP                                       │
│ updated_at      TIMESTAMP                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ bom_items (replaces BOM sheet — project-specific parts)         │
├─────────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                                │
│ project_id      UUID FK → projects                              │
│ part_id         UUID FK → parts                                 │
│ quantity        INTEGER NOT NULL                                │
│ unit_price      DECIMAL(12,2)      -- override at project level │
│ notes           TEXT                                            │
│ created_at      TIMESTAMP                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Submittal Tables

```
┌─────────────────────────────────────────────────────────────────┐
│ submittals (a submittal package for a project)                  │
├─────────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                                │
│ project_id      UUID FK → projects                              │
│ title           VARCHAR NOT NULL                                │
│ status          ENUM('draft','generated','submitted','approved')│
│ generated_at    TIMESTAMP                                       │
│ created_at      TIMESTAMP                                       │
│ updated_at      TIMESTAMP                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ submittal_sections (chapters in the submittal — by category)    │
├─────────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                                │
│ submittal_id    UUID FK → submittals                            │
│ category_id     UUID FK → part_categories                       │
│ title           VARCHAR NOT NULL    -- chapter name             │
│ sort_order      INTEGER                                         │
│ include_valve_schedule    BOOLEAN DEFAULT FALSE                 │
│ include_damper_schedule   BOOLEAN DEFAULT FALSE                 │
│ created_at      TIMESTAMP                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ submittal_items (parts included in a submittal section)         │
├─────────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                                │
│ section_id      UUID FK → submittal_sections                    │
│ part_id         UUID FK → parts                                 │
│ sort_order      INTEGER             -- priority ranking         │
│ spec_override   VARCHAR             -- per-submittal spec text  │
│ created_at      TIMESTAMP                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Controls Points Tables

```
┌─────────────────────────────────────────────────────────────────┐
│ point_types (replaces Master Points List — 114 rows)            │
├─────────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                                │
│ name            VARCHAR NOT NULL UNIQUE                         │
│ ui_count        INTEGER DEFAULT 0                               │
│ ao_count        INTEGER DEFAULT 0                               │
│ do_count        INTEGER DEFAULT 0                               │
│ startup_hours   DECIMAL(5,2)                                    │
│ cad_hours       DECIMAL(5,2)                                    │
│ design_hours    DECIMAL(5,2)                                    │
│ programming_hours DECIMAL(5,2)                                  │
│ graphics_hours  DECIMAL(5,2)                                    │
│ pm_hours        DECIMAL(5,2)                                    │
│ created_at      TIMESTAMP                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ controllers (replaces Controller Points List — 278 rows)        │
├─────────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                                │
│ description     VARCHAR NOT NULL                                │
│ model           VARCHAR NOT NULL                                │
│ ui_capacity     INTEGER                                         │
│ uo_capacity     INTEGER                                         │
│ ao_capacity     INTEGER                                         │
│ bo_capacity     INTEGER                                         │
│ has_hoa         BOOLEAN DEFAULT FALSE                           │
│ has_motion      BOOLEAN DEFAULT FALSE                           │
│ created_at      TIMESTAMP                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ point_model_mappings (replaces Points to Model Nums matrix)     │
├─────────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                                │
│ point_type_id   UUID FK → point_types                           │
│ part_id         UUID FK → parts                                 │
│ is_default      BOOLEAN DEFAULT FALSE                           │
│ sort_order      INTEGER                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  Parts   │ │ Projects │ │Submittals│ │ Vendors  │      │
│  │ Library  │ │  & BOMs  │ │Generator │ │  Mgmt    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │ Points   │ │ Reports  │ │  File    │                   │
│  │ Matrix   │ │& Summary │ │ Manager  │                   │
│  └──────────┘ └──────────┘ └──────────┘                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API
┌──────────────────────┴──────────────────────────────────────┐
│                   Node.js Backend                           │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  CRUD    │ │ Submittal│ │  Excel   │ │   PDF    │      │
│  │  APIs    │ │  Builder │ │ Export   │ │ Builder  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐                                 │
│  │  File    │ │  Import  │                                 │
│  │ Upload   │ │  (XLSX)  │                                 │
│  └──────────┘ └──────────┘                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│              PostgreSQL + File Storage                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
/
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── parts/           # Parts library CRUD
│   │   │   ├── projects/        # Project & BOM management
│   │   │   ├── submittals/      # Submittal builder UI
│   │   │   ├── vendors/         # Vendor management
│   │   │   ├── points/          # Points matrix & controllers
│   │   │   └── common/          # Shared components (tables, forms)
│   │   ├── pages/               # Route-level page components
│   │   ├── api/                 # API client functions
│   │   ├── types/               # TypeScript interfaces
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── server/                      # Node.js backend
│   ├── src/
│   │   ├── routes/              # Express route handlers
│   │   ├── services/            # Business logic
│   │   │   ├── submittal.ts     # Submittal generation
│   │   │   ├── pdf.ts           # PDF generation (replaces LaTeX)
│   │   │   ├── excel.ts         # Excel export
│   │   │   └── import.ts        # XLSX import (migrate existing data)
│   │   ├── middleware/          # Auth, error handling
│   │   └── index.ts
│   ├── prisma/
│   │   └── schema.prisma        # Database schema
│   ├── uploads/                 # Cut sheet PDF storage
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml           # PostgreSQL + app containers
└── package.json                 # Root workspace
```

---

## Phased Implementation

### Phase 1: Foundation (Build first)
**Goal: Core data model, API, and parts library UI**

1. Initialize monorepo (client + server)
2. Set up PostgreSQL with Docker + Prisma schema
3. Seed database by importing data from the existing XLSM
4. Build CRUD API for: parts, vendors, manufacturers, categories
5. Build Parts Library page — searchable/filterable table of all 7,000 parts
6. Build Vendor Management page
7. File upload endpoint for cut sheets, IOMs, PICS

### Phase 2: Projects & BOMs
**Goal: Create projects and assemble Bills of Materials**

1. Project CRUD (job name, job number, date, status)
2. BOM builder — search parts library, add to project BOM with quantities
3. BOM table view with cost calculations (qty x discount price)
4. Excel export of BOM (replaces MR Maker / Material Requisition sheets)

### Phase 3: Submittal Generator
**Goal: Replace the LaTeX pipeline entirely**

1. Submittal builder UI — select project, choose sections by category
2. Auto-populate submittal items from BOM, grouped by category
3. Drag-and-drop reordering (priority ranking)
4. PDF generation with:
   - Cover page (DMG SC branding, project info)
   - Table of Contents
   - Chapter sections by category
   - Inline cut sheet PDFs with model number overlays
   - Valve/Damper schedule pages (landscape)
5. Excel export of submittal data
6. Spec section annotations on each item

### Phase 4: Points & Controls
**Goal: Replace the points matrix and controller sheets**

1. Point types management (Master Points List)
2. Controller library (Controller Points List)
3. Equipment Points Matrix editor
4. Equipment Panel Matrix editor
5. Points-to-Model mapping
6. Summary Page generation with labor/cost calculations

### Phase 5: Polish & Scale
**Goal: Team readiness**

1. User authentication (JWT + roles)
2. Project history / audit log
3. Dashboard with project status overview
4. Bulk import/export tools
5. S3-compatible file storage option

---

## Key Design Decisions

1. **PDF replaces LaTeX**: Using Puppeteer to render HTML templates to PDF. Same visual output (cover page, TOC, cut sheet overlays) without requiring a LaTeX installation or CSV export step.

2. **Single source of truth**: The Master Parts List becomes a normalized database. No more duplicated data across 51 sheets — category sheets, submittal sheets, and BOM sheets are all views/queries against the same parts table.

3. **Import existing data**: Phase 1 includes an XLSX importer that reads your current workbook and seeds the database with all 7,000 parts, 54 vendors, and associated metadata.

4. **Cut sheets stored in-app**: PDFs uploaded directly to the app and linked to parts, replacing the Box/network drive file paths.

5. **Incremental migration**: Each phase delivers standalone value. You can start using the parts library (Phase 1) while still using Excel for submittals, then cut over when Phase 3 is ready.
