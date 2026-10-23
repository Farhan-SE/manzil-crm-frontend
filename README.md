# Manzil CRM — Frontend

Next.js app for Manzil CRM, deployed on Vercel. It talks to the NestJS API in `manzil-crm-backend`.
Read `AGENTS.md` before changing Next.js code: this Next.js version differs from older ones.

## Setup

```bash
npm install
npm run dev     # http://localhost:3000
```

`.env`:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the API, e.g. `http://localhost:3001` |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run test:cache` | API caching and invalidation regression tests; no server required |

## Navigation data

Authenticated JSON reads share a bounded, in-memory cache for five minutes. Returning to a list or detail reuses its response, and simultaneous identical reads share one request. Successful writes invalidate related resources, including joined lead/customer/task data and summaries. Failed requests are not cached. Background import completion also invalidates affected lists, while notifications, import polling and phone availability checks always reach the API.

List filters, sorting and pagination are retained in memory, separately for linked searches. Scroll positions are restored after rows load. A browser refresh starts fresh; signing out or changing accounts clears retained data and list state. Writes in another tab invalidate the affected API cache in this tab. Changes by other users become visible on the next request after cache expiry or a browser refresh.

## Layout

```
app/(dashboard)/   the signed-in app; layout.tsx mounts TopNav, Sidebar, notification toasts and the import progress card
app/platform/      platform-admin screens (companies)
components/        screens' building blocks; components/ui holds shared primitives (Icon, Select, Listbox, ...)
lib/api.ts         every API call, plus token storage
lib/session.ts     the signed-in member's role and permissions (useCan, useScope)
public/icons/      Figma-exported SVG icons, used through <Icon name="..." />
```

The UI follows the Figma design. New screens reuse the existing styles and tokens.

## Client import

Clients → **Import** takes a `.csv` or `.xlsx` of up to 20 MB. The file uploads straight to S3,
and the import runs in the background on the server, so the modal closes as soon as it starts.

| Piece | Role |
|---|---|
| `components/ImportCsvModal.tsx` | Picks the file. For clients, `startCustomerImport` uploads it and starts the job. Leads and units still import synchronously (CSV, 5 MB). Also exports `ImportDialog` and `ImportResultView`, reused for the result. |
| `components/ImportProgress.tsx` | Card in the bottom-right corner of every dashboard page, styled like the notification toasts: progress bar while running, then "Import finished" (added · skipped, **View details**) or "Import failed". Polls every 2 s. On load it resumes the company's running import, or this tab's last one if it finished during a reload. Only shown to roles with `customers.import`. |
| `lib/customer-import.ts` | `started` / `finished` browser events and the tab's tracked job id, so the modal, card and clients page stay in sync. The clients list reloads itself when an import finishes. |
| `lib/api.ts` | `startCustomerImport`, `getCustomerImport`, `getActiveCustomerImport` |

The S3 bucket only accepts uploads from origins listed in its CORS configuration. Add each Vercel
domain there before deploying. How the import works end to end is in the backend's
`docs/client-import.md`, and the AWS resources are in `docs/aws-setup.md`.
