# Scale Architecture — Makkal Connect

Target: 1Cr+ reports, 50L+ cadres, no UI freezes.

## Data Layer
- Partition `problems`, `problem_updates`, `problem_assignments` BY RANGE(created_at) monthly via pg_partman
- BRIN index on `created_at`; b-tree composite `(constituency, status, created_at DESC)` and `(department, status, created_at DESC)` (added in this migration)
- Move resolved >12mo to `problems_archive` via nightly job
- Materialized views refreshed every 60s by pg_cron CONCURRENTLY:
  - `mv_constituency_kpis`, `mv_dept_kpis`, `mv_cadre_leaderboard`, `mv_public_stats`
- Replace `get_public_stats()` with a single MV read

## Query Layer
- Cursor pagination (`id < lastId`) — kill OFFSET
- Default 25 rows, hard cap 100
- One RPC per hot list (`feed_page`, `cadre_page`) returning rows + next_cursor
- Aggregate dashboards always read MVs, never base tables

## Caching
- React Query: `staleTime: 60_000`, `gcTime: 300_000`
- Persist KPI cache in localStorage (broadcast invalidation across tabs)
- Edge-cached `LiveStats` JSON (`Cache-Control: public, max-age=60`)

## Realtime
- Subscribe per constituency channel, never global
- Throttle UI batches to 1/sec
- Polling fallback (30s) for lists >500 rows

## Frontend
- `React.lazy()` admin modules (Recharts ~150kb chunked off main)
- Virtualize >100-row lists with `@tanstack/react-virtual`
- Skeletons everywhere, no global spinners
- Image: signed URLs + `srcset` thumbs from Supabase Storage transformations

## Write Path
- Bulk imports + bulk SMS go through `pgmq` queue + cron worker
- `idempotency_key` on every mutation that can be retried
- IP-based token-bucket rate limiter in edge functions

## Notifications
- SMS via Twilio connector → `sms_log` (idempotent per `${problemId}-${trigger}`)
- Email via custom SMTP → `email_outbox` queue + cron drain
- Recipients resolved by SQL function `get_notification_recipients`

## Observability
- `pg_stat_statements` weekly review, slow-query threshold 250ms
- Error budget: <1% 5xx, p95 list query <300ms

## Infra
- Recommend Cloud instance Small → Large at 100k DAU
- Storage lifecycle: evidence >24mo to cold bucket
