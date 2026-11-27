<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/brand/logo-white.png">
  <img src="public/brand/logo-blue.png" alt="TechRevive" width="320">
</picture>

<br><br>

### Second-hand tech, quality-checked and given a second life.

A bilingual, WhatsApp-assisted storefront and admin back-office for a direct-supplier
reseller of refurbished laptops, phones and gadgets in Jabodetabek.

<br>

![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript_strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_6-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Postgres](https://img.shields.io/badge/Neon_Postgres-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

![Tests](https://img.shields.io/badge/tests-142_passing-2ea44f?style=flat-square)
![i18n](https://img.shields.io/badge/i18n-ID_%7C_EN-07273E?style=flat-square)
![Node](https://img.shields.io/badge/node-%E2%89%A522-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Runtime deps](https://img.shields.io/badge/no_spreadsheet_lib-zero_dep_xlsx-8A99A8?style=flat-square)

[Live demo](#live-demo) &nbsp;|&nbsp; [Features](#features) &nbsp;|&nbsp; [Engineering highlights](#engineering-highlights) &nbsp;|&nbsp; [Getting started](#getting-started) &nbsp;|&nbsp; [Docs](#documentation)

</div>

---

## The idea

Most small second-hand electronics sellers run on chat threads and spreadsheets. Buyers
cannot tell what is in stock, what condition it is in, or where their order is.

**TechRevive** turns that workflow into a real product without forcing a payment gateway
on customers who prefer to talk to a person:

1. Browse a catalog with real spec filters (RAM, storage, CPU, condition, brand).
2. Send an inquiry with one click. It opens WhatsApp with the product pre-filled.
3. The team answers, quotes, confirms payment and ships.
4. The customer follows the order on a public tracking page and confirms delivery.

Every item goes through a **Check QC** step and carries a **1-month warranty**, with
delivery handled by the team. The brand promise is baked into the copy, the status flow
and the data model.

## Live demo

> Add your deployed URL here, for example `https://techrevive.vercel.app`.

<!--
## Screenshots

Put images in docs/screenshots/ and uncomment.

<table>
  <tr>
    <td><img src="docs/screenshots/home.png" alt="Landing page"></td>
    <td><img src="docs/screenshots/catalog.png" alt="Catalog with filters"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/track.png" alt="Order tracking"></td>
    <td><img src="docs/screenshots/admin.png" alt="Admin dashboard"></td>
  </tr>
</table>
-->

## Features

### Storefront

| | |
|---|---|
| **Bilingual** | Full Indonesian and English routing (`/id`, `/en`) with typed message catalogs. |
| **Catalog** | Spec-aware filters, URL-synced state, one-click reset, two-column grid on mobile. |
| **Brand marquee** | Logo-only, grayscale by default, full color on hover, click to filter by brand. |
| **WhatsApp inquiry** | Pre-filled message per product, no checkout friction, no payment gateway. |
| **Order tracking** | Public token-based page with a stepper (reply, order, pay, ship, deliver, done). |
| **Product comparison** | Compare up to 4 units side by side, "only differences" mode, shareable link, spotlighted on the home page. |
| **Help me decide** | Four-question needs finder on the catalog that turns answers into filters; first-visit prompt, reopen anytime. |
| **Customer confirmation** | "Received" button on the tracking page, thank-you message, stepper checks off. |
| **Invoice** | Shareable invoice page per order, no login required. |
| **Warranty claims** | Customers file a claim on the tracking page (code + WhatsApp number), see warranty days left and follow the status. |
| **Smart search** | Typo-tolerant search (pg_trgm) with live suggestions and relevance ranking. |
| **Compare products** | Side-by-side table for up to 4 units, differences highlighted, shareable link. |
| **Trust pages** | FAQ, How it works, Policy and Contact, all in both languages. |
| **Adaptive branding** | Logo and tab icon switch between navy-on-white and white-on-navy with the OS theme. |

### Admin back-office

| | |
|---|---|
| **Products** | Create, edit, publish, with image preview instead of raw URLs. |
| **Bulk import** | CSV or Excel upload with template, dry-run, and all-or-nothing commit. |
| **Pricing engine** | Enter cost and margin, the sell price is computed and rounded to Rp 1.000, with a minimum-margin guard. |
| **Inquiries** | Status pipeline with SLA alerts, mark delivered or done on behalf of the customer. |
| **Taxonomy** | Brands (with logo upload), categories and spec definitions. |
| **Shipping** | Jabodetabek delivery fee table. |
| **Reports** | Sales and inquiry summaries. |
| **Users and roles** | RBAC with Admin/Developer, Owner and Staff. |
| **Warranty claims** | Claim queue with status flow, customer-visible resolution note and team notes. |
| **Assignment and team notes** | Take, release or assign inquiries and claims; "my tasks" and "unassigned" filters; notes thread. |
| **Audit log** | Who changed what and when, for every sensitive action. |
| **Safe actions** | A global confirm dialog guards every submit, delete and logout. |

## Engineering highlights

This is the part I am proudest of. The product is small on purpose, so the effort went into
getting the details right.

**Security**
- Sessions are signed JWTs (`jose`) in a `__Host-` prefixed cookie (Secure, path `/`, no
  domain), with "log out of all sessions" support.
- Passwords hashed with Argon2 (`@node-rs/argon2`).
- Strict **Content-Security-Policy**: per-request nonces for admin and API routes, and a
  relaxed policy for statically generated public pages (which cannot carry a nonce).
- Cloudflare Turnstile on public forms, zod validation on every server action.
- Role checks enforced server-side, never only in the UI.

**Performance**
- Public pages are ISR-cached with `unstable_cache`, and a single
  `revalidateStorefront()` helper invalidates exactly the right paths after any admin change.
- Heavy motion (three.js hero, GSAP, anime.js) is gated: desktop only, idle-time, and
  disabled under `prefers-reduced-motion`.
- Images are served through Cloudinary transformations, sized per use.

**Data integrity**
- **All-or-nothing import**: every row is validated first, and nothing is written if any
  row fails. A dry-run mode shows the exact errors per row and column.
- **Dependency-free Excel**: a small `xlsx` reader and writer built on `node:zlib`, with
  zip-bomb limits, styled headers and dropdown validations in the generated template.
- **Storage hygiene**: uploads are named by content hash (so duplicates collapse), replaced
  or deleted images are released automatically, and a scheduled sweep removes orphans.
- **Logo quality gate**: brand logos must be genuinely transparent. The upload route sniffs
  the PNG/WebP alpha channel instead of trusting the file extension.

**Developer experience**
- TypeScript strict mode, Prisma 6, and 142 tests run on Node's built-in test runner with
  no extra framework (`node --test`).
- Cron endpoints for SLA alerts, expiry and image sweeps, documented in `docs/CRON.md`.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Server Actions, Turbopack dev), React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4, CSS layers for component styles |
| Database | PostgreSQL on Neon, Prisma 6 ORM |
| Auth | jose (JWT), Argon2, role-based access control |
| Media | Cloudinary (primary), S3-compatible fallback |
| Motion | GSAP, anime.js v4, three.js |
| Validation | zod |
| Bot protection | Cloudflare Turnstile |
| Hosting | Vercel |

## Project structure

```
techrevive/
  docs/                  CRON, FLOW, HOSTING, PLAN
  prisma/                schema, seeds, role tool
  public/brand/          logo and icon assets
  src/
    app/
      [locale]/          storefront: catalog, product, track, invoice, faq, policy...
      admin/(panel)/     products, inquiries, taxonomy, shipping, reports, users, audit
      api/               upload, template download, cron
    components/          shared UI (confirm dialog, data table, brand marquee...)
    lib/                 pricing, import, xlsx-lite, cloudinary, auth, cache, maintenance
    messages/            id.json, en.json
  tests/                 node:test suites
```

## Getting started

**Requirements:** Node.js 22+, a PostgreSQL database (a free [Neon](https://neon.tech)
project works well).

```bash
git clone https://github.com/<your-username>/techrevive.git
cd techrevive
npm install
```

Create a `.env` file (Prisma reads `.env`, not `.env.local`):

```bash
# Database (Neon)
DATABASE_URL="postgresql://...-pooler.../db?sslmode=require"   # pooled
DIRECT_URL="postgresql://.../db?sslmode=require"               # direct, for migrations

# Core
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
SESSION_SECRET="<long random string>"
WHATSAPP_NUMBER="62812xxxxxxx"
CRON_SECRET="<long random string>"

# First admin (used by db:seed)
SEED_ADMIN_EMAIL=""
SEED_ADMIN_PASSWORD=""

# Images (Cloudinary)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
CLOUDINARY_FOLDER="techrevive"

# Bot protection (optional in dev)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
TURNSTILE_SECRET_KEY=""
```

Then set up the database and start the app:

```bash
npx prisma generate
npx prisma db push          # or: npm run db:migrate
npm run db:seed             # base data and first admin
npm run db:seed:demo        # optional: sample products
npm run dev
```

Open <http://localhost:3000> for the storefront and <http://localhost:3000/admin> for
the back-office.

> Keep Prisma on 6.x. Prisma 7 changes the schema format and is not supported by this project yet.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | `prisma generate` then production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Next.js lint |
| `npm test` | Run all 142 tests |
| `npm run db:migrate` / `db:deploy` | Create / apply migrations |
| `npm run db:seed` / `db:seed:demo` | Seed base / demo data |
| `npm run db:set-role` | Change a user's role from the CLI |

## Deployment

Deploys to Vercel with Neon and Cloudinary. Step-by-step instructions, including
environment variables and scheduled maintenance, are in [`docs/HOSTING.md`](docs/HOSTING.md)
and [`docs/CRON.md`](docs/CRON.md).

## Documentation

- [`docs/PLAN.md`](docs/PLAN.md) - product plan and scope
- [`docs/FLOW.md`](docs/FLOW.md) - inquiry, order and status flow
- [`docs/HOSTING.md`](docs/HOSTING.md) - deployment and third-party setup
- [`docs/CRON.md`](docs/CRON.md) - scheduled maintenance jobs
- [`docs/SECURITY-AUDIT.md`](docs/SECURITY-AUDIT.md) - latest security, performance and edge-case audit
- [`docs/ASSETS.md`](docs/ASSETS.md) - visual asset plan, free tools, prompts and workflow
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - layers, scaling rules and how to add a feature
- [`docs/SEO.md`](docs/SEO.md) - SEO and generative-engine (GEO) setup
- [`docs/ROADMAP.md`](docs/ROADMAP.md) - designed next features

## Roadmap

- [ ] Online payment option alongside WhatsApp confirmation
- [ ] Stock reservation while an inquiry is open
- [ ] Customer accounts and order history
- [ ] Webhook notifications for order status changes

## License

All rights reserved. This repository is published for portfolio purposes.
Contact the author for reuse. (Replace with MIT or another license if you prefer.)

---

<div align="center">

Built by **[Your Name](https://github.com/<your-username>)** &nbsp;|&nbsp; Jakarta, Indonesia

</div>
