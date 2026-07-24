## Overview

Six changes across the Super Admin experience, Cadre tracking, and security hardening.

---

### 1. Bulk deadline extension (Super Admin)

Add a "Extend deadlines" control on the Problems, Welfare, and Fund Requests management screens.

- Dropdown with presets: +3 days, +5 days, +7 days, custom (date picker).
- Scope selector: "All open items due on/before [date]" (defaults to today) or "All open items in current filter view".
- On confirm: bulk update `due_at` / SLA target date on matching rows (problems, welfare_issues, fund_assistance_requests, blueprint_tasks belonging to them).
- Writes an audit row and shows a toast with count updated.

### 2. Temporary stop (hold) for Problems, Welfare, Fund Requests

- Add columns: `on_hold boolean default false`, `hold_reason text`, `held_at timestamptz`, `held_by uuid` on `problems`, `welfare_issues`, `fund_assistance_requests`.
- Super Admin detail modal gets "Pause" / "Resume" buttons with reason prompt.
- While on hold: SLA timers and auto-escalation skip these items (guarded in relevant edge functions / views). Status label shows an amber "On hold" pill in lists.
- Cadres see a read-only "Paused by admin" banner and cannot edit blueprint tasks until resumed.

### 3. Security hardening (Admin + Cadre)

- **Auth**: enforce strong password policy on signup + password change (min 10 chars, mixed case, digit, symbol) via zod.
- **Session**: enable Supabase leaked-password protection; add idle-timeout auto-logout (30 min) for admin dashboard.
- **Rate limiting**: add a lightweight `auth_attempts` table + edge function guard for `/admin` and `/cadre/login` (max 5 failures / 15 min / IP+email → temporary lock).
- **RLS review**: audit all admin-only tables to ensure no `anon` grants leak; convert any client-side role check to server-side via `has_role()`.
- **Edge functions**: enforce `getClaims()` + admin-role check on every admin-only function (create-user, ai-* admin, delete endpoints).
- **Headers**: add CSP, X-Frame-Options, Referrer-Policy via `index.html` meta + `vercel/hosting` headers where possible.
- **Input validation**: add zod schemas on all admin mutation forms.
- **Audit log**: new `admin_audit_log` table capturing who did what (delete, hold, extend, role change).

### 4. Super Admin can add location + evidence to any report

In the Problem / Welfare / Fund detail modal, when `latitude/longitude` is null OR when admin wants to enrich:

- "Set location on map" button opens a Google-Maps-based picker (project already uses map components) → saves `latitude`, `longitude`, and reverse-geocoded `address_line`.
- "Add evidence images" uploader that pushes files to the existing `problem-media` / `completed-works` / `corruption-evidence` buckets and inserts rows into `problem_media` (and equivalent for welfare/fund; add a `welfare_media` / `fund_media` table if missing).
- Both actions logged in `admin_audit_log`.

### 5. Fix "Last seen" always showing "Never opened app" for cadres

Root cause is unconfirmed — needs a quick check in build mode. Likely one of:
- `cadres.last_seen_at` column exists but is never written, or
- code reads a differently-named column, or
- write happens but RLS blocks the update from the cadre client.

Plan:
1. Confirm the column name and where it's read (Cadre list / CadreDetailModal).
2. Add a heartbeat: on cadre app mount + every 5 min while active, upsert `last_seen_at = now()` via an RPC (`SECURITY DEFINER`) so RLS can't block it.
3. Backfill existing cadres to `null` (leave as-is) and let heartbeat populate going forward.
4. Display formatted IST relative time ("2 min ago", "3 h ago", "Never" only if truly null).

### 6. Delete option for issues data (Super Admin)

- Add "Delete" action (with confirm dialog + typed reason) in Problems, Welfare, Fund Requests, Corruption Reports management tables and detail modals.
- Server: RPC `admin_delete_issue(_kind, _id, _reason)` — SECURITY DEFINER, checks `has_role(auth.uid(),'admin')`, cascades related rows (media, assignments, updates, blueprints), writes to `admin_audit_log`.
- Soft-delete first (`deleted_at`, `deleted_reason`, `deleted_by`), hard-delete only after 30 days via a scheduled cleanup — protects against accidental loss.
- Deleted rows hidden from every non-admin query.

---

## Technical notes

- Migrations needed: new columns (`on_hold*`, `deleted_at*`, `last_seen_at` if missing), new tables (`admin_audit_log`, `auth_attempts`, optional `welfare_media`, `fund_media`), new RPCs (`admin_bulk_extend_deadline`, `admin_toggle_hold`, `admin_delete_issue`, `cadre_heartbeat`).
- All RPCs `SECURITY DEFINER` + explicit role check inside the function body.
- UI reuses existing shadcn Dialog / DatePicker / Popover patterns; no new deps.
- Google Maps picker uses the existing map integration already in `src/components/maps/`.

## Open questions

1. For hold/pause — should SLA clock **pause** (add held duration back to due date on resume) or just **suppress escalations** while held? I'd default to pause-and-extend.
2. For delete — soft-delete with 30-day recovery window OK, or do you want immediate hard delete?
3. Idle-logout of 30 min OK for admins, or longer?