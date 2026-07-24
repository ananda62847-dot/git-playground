# Public Portal — External App Integration Plan

You are moving the **citizen-facing website out of Lovable** into a fresh, independently hosted app (any stack: Next.js, Nuxt, Astro, SvelteKit, Expo, native mobile, plain HTML/JS…). This Lovable project keeps only **Admin + Cadre**.

The **backend does not move**. Both apps read/write the same Supabase project. All contracts below are stable HTTPS endpoints — no Lovable-specific bindings, no shared code.

---

## 1. Fixed backend endpoints

```
BASE URL          https://ifvktibgarrprfbwuupe.supabase.co
REST              {BASE}/rest/v1
RPC               {BASE}/rest/v1/rpc/<function_name>
STORAGE           {BASE}/storage/v1
EDGE FUNCTIONS    {BASE}/functions/v1/<function_name>
REALTIME (WSS)    wss://ifvktibgarrprfbwuupe.supabase.co/realtime/v1/websocket
ANON API KEY      eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmdmt0aWJnYXJycHJmYnd1dXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDY5NjIsImV4cCI6MjA5NTM4Mjk2Mn0.bSS8deKzZNXVuOVUgndX-M8BMsT-kL4lg-cieTANFaM
```

Every request from the public app must send both headers:
```
apikey:        <ANON KEY>
Authorization: Bearer <ANON KEY>
Content-Type:  application/json
```

Two consumption modes — pick whichever suits the stack:
- **Supabase JS SDK** (`@supabase/supabase-js`) — recommended for JS/TS apps.
- **Plain HTTPS** (fetch/axios/curl) — for any other language.

Both hit the same URLs.

---

## 2. Supabase configuration you must apply **once**

Add these to Supabase → Auth → URL Configuration:
```
Site URL:                 https://<your-new-public-domain>
Additional redirect URLs: https://<your-new-public-domain>/**
```
Supabase Edge Functions already return `Access-Control-Allow-Origin: *`, so CORS works out of the box. If you later whitelist origins, add both your public and staff domains.

Apply the migration in §7 once against Supabase (via this Lovable project) to enable anon-role inserts and public RPC grants required by the external app.

---

## 3. Public API surface — every endpoint your new app needs

### 3.1 Submit a general problem report (pothole, streetlight, garbage, water…)

**SDK**
```ts
const { data } = await supabase.from('problems').insert({
  reporter_name, reporter_phone, reporter_age,
  city, constituency, area, pincode, address_line,
  category, subcategory, department,
  title, description, urgency,
  location_lat, location_lng,
  proof_urls,             // storage URLs (uploaded first — §3.10)
  voice_note_url, voice_transcript,
  status: 'submitted',
}).select('id, ticket_no').single();
```

**HTTP**
```
POST /rest/v1/problems?select=id,ticket_no
Prefer: return=representation

{ "reporter_name": "...", "city": "...", ... , "status": "submitted" }
```
Response: `[{ "id": "uuid", "ticket_no": "MC-2026-000123" }]`

### 3.2 Submit a welfare issue (pension, ration, scheme problem)
```
POST /rest/v1/welfare_issues
```
Body: same shape plus `scheme_type`, `subcategory`, `months_pending`, `beneficiary_name`, `beneficiary_id`.

Optional confirmation SMS after insert:
```
POST /functions/v1/send-sms
{ "welfareId": "<uuid>", "trigger": "WELFARE_SUBMITTED" }
```

### 3.3 Submit a corruption report (bribes, misconduct)
Use the **security-definer RPC** (validates good-faith flag and description length):
```
POST /rest/v1/rpc/submit_corruption_report
{
  "_city": "...", "_constituency": "...", "_area": "...",
  "_department": "...", "_description": "...",
  "_amount_demanded": 500, "_incident_date": "2026-06-30",
  "_incident_type": "...", "_office_location": "...",
  "_person_involved": "...", "_person_name": "...",
  "_incident_time": "10:30",
  "_confirmed_good_faith": true,
  "_evidence_urls": ["https://.../file1.jpg"]
}
```
Response: `[{ "ticket_no": "CR-2026-000045" }]`

### 3.4 Submit a citizen suggestion (structured, non-voting)
```
POST /rest/v1/citizen_suggestions
{ "category":"...", "subcategory":"...", "priority":"...", "urgency":"...",
  "city":"...", "constituency":"...", "area":"...",
  "beneficiary_type":"...", "expected_outcome":"...",
  "title":"...", "description":"...",
  "submitted_by_name":"...", "submitted_by_phone":"...",
  "status":"submitted" }
```

### 3.5 Track any ticket by number (read-only, public)
Single RPC covers problems, welfare and corruption:
```
POST /rest/v1/rpc/track_ticket
{ "_ticket_no": "MC-2026-000123" }
```
Response:
```json
{
  "kind": "problem",
  "ticket_no": "MC-2026-000123",
  "status": "in_progress",
  "title": "Broken streetlight",
  "category": "streetlight",
  "city": "Chennai",
  "constituency": "T.Nagar",
  "created_at": "2026-07-01T08:12:00Z",
  "resolved_at": null,
  "updates": [
    { "at": "...", "status": "assigned", "note": "...", "before_url": null, "after_url": null },
    { "at": "...", "status": "in_progress", "note": "Work started", ... }
  ]
}
```

### 3.6 Public statistics & dashboards
| Feature                    | Endpoint                                                                 |
|----------------------------|--------------------------------------------------------------------------|
| Landing counters           | `POST /rest/v1/rpc/get_public_stats`                                     |
| City heat counts           | `POST /rest/v1/rpc/get_city_problem_counts`                              |
| Constituency heat counts   | `POST /rest/v1/rpc/get_constituency_problem_counts`                      |
| Per-city category breakdown| `POST /rest/v1/rpc/get_city_breakdown` — body `{"_city":"Chennai"}`      |
| Per-constituency breakdown | `POST /rest/v1/rpc/get_constituency_breakdown`                           |

### 3.7 Cadres & leaderboards
| Feature                | Endpoint                                                                                        |
|------------------------|--------------------------------------------------------------------------------------------------|
| Know your cadres       | `POST /rest/v1/rpc/get_public_cadres` — body `{"_constituency":"T.Nagar"}` (nullable = all)      |
| Cadre leaderboard      | `POST /rest/v1/rpc/get_cadre_leaderboard` — body `{"_constituency":null,"_limit":50}`            |
| Team leaderboard       | `POST /rest/v1/rpc/get_team_leaderboard`                                                         |

### 3.8 Completed works & social feed
```
GET /rest/v1/completed_works?published=eq.true&order=published_at.desc&limit=30
GET /rest/v1/completed_works?slug=eq.<slug>&select=*
GET /rest/v1/social_posts?visibility=eq.public&order=created_at.desc&limit=50
GET /rest/v1/citizen_suggestions?hidden=eq.false&order=priority_score.desc&limit=50&select=id,title,category,priority_score,created_at
```

### 3.9 Push notifications (opt-in)
After the citizen accepts FCM permission:
```
POST /rest/v1/notification_tokens
{ "token": "<fcm-token>", "platform": "web", "ticket_no": "MC-...", "phone": "+91...", "role": "citizen" }
```
The existing `send-push` edge function delivers to matching tokens on every status change.

### 3.10 File uploads (photos, PDFs, voice notes)
Uploads go directly to Supabase Storage. Buckets are already public-read.

**SDK**
```ts
const path = `${yyyymm}/${crypto.randomUUID()}-${file.name}`;
await supabase.storage.from('problem-media').upload(path, file, { contentType: file.type });
const { data: { publicUrl } } = supabase.storage.from('problem-media').getPublicUrl(path);
```

**HTTP**
```
POST /storage/v1/object/problem-media/2026-07/<uuid>-photo.jpg
Content-Type: image/jpeg
Body: <binary>
```
Public URL pattern:
```
{BASE}/storage/v1/object/public/<bucket>/<path>
```

Buckets available:
- `problem-media` — problem & welfare photos, PDFs
- `corruption-evidence` — corruption proofs
- `voice-notes` — recorded audio
- `completed-works` — after-photos (read-only for public)

### 3.11 Realtime updates (optional, over WSS)
For a live tracking page, subscribe to a single row filter:
```ts
const ch = supabase
  .channel(`ticket-${ticketNo}`)
  .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'problems', filter: `ticket_no=eq.${ticketNo}` },
      p => setStatus(p.new.status))
  .subscribe();
```
Publication `supabase_realtime` already includes `problems`, `welfare_issues`, `problem_updates`.

### 3.12 Utility edge functions
| Function              | Body                                                       | Purpose                              |
|-----------------------|------------------------------------------------------------|--------------------------------------|
| `send-sms`            | `{ problemId }` or `{ welfareId, trigger }`                | Fire confirmation SMS                |
| `send-push`           | `{ problemId, trigger }`                                   | Push notification to registered token|
| `transcribe-voice`    | `{ url }`                                                  | Voice-to-text for voice notes        |
| `classify-severity`   | `{ title, description, category }`                         | AI suggests urgency (optional)       |

Do **not** call: `ai-copilot`, `create-user`, `cadre-signup`, `ai-*` (staff-only, gated by JWT/RLS).

---

## 4. What the new public app must ship

Minimum page set (name them however you like):
1. Landing (`get_public_stats` + hero)
2. Report a Problem (`POST problems` + storage upload)
3. Report Welfare Issue (`POST welfare_issues`)
4. Report Corruption (`rpc submit_corruption_report`)
5. Submit Suggestion (`POST citizen_suggestions`)
6. Track Ticket (`rpc track_ticket` + realtime subscribe)
7. Live Map (`rpc get_city_problem_counts` / `rpc get_constituency_problem_counts`)
8. Know Your Cadres (`rpc get_public_cadres`)
9. Leaderboards (`rpc get_cadre_leaderboard`, `rpc get_team_leaderboard`)
10. Completed Works index + detail (`GET completed_works`)
11. Suggestions board (`GET citizen_suggestions`)
12. Privacy / Terms / Install PWA

Static assets (bilingual strings EN/TA, constituency list, department list, welfare scheme list, suggestion categories) live inside the new repo — copy them from this project's `src/lib/` if you want to reuse:
`constituencies.ts`, `departments.ts`, `welfareSchemes.ts`, `suggestionCategories.ts`, `areas.ts`.

Everything else (auth, admin dashboards, AI ops center, cadre workspace, blueprints, escalations) stays here in Lovable.

---

## 5. Data flow end-to-end

```
Citizen (new app) ──POST /rest/v1/problems──▶ Supabase (RLS: anon INSERT allowed)
                                                    │
                                                    ├── trigger on_problem_inserted
                                                    │      └─▶ ai-duplicate-detect + ai-resolution-blueprint
                                                    │
                                                    ├── enqueue_email / enqueue_sms
                                                    │      └─▶ notification workers → citizen SMS/email
                                                    │
                                                    └── Realtime broadcast on `problems`
                                                           └─▶ Lovable staff app: admin + cadre inbox update live
```

Return path (staff → citizen):
```
Cadre closes task → problem_updates row → citizen tracking page (WSS) updates instantly
                                       └─▶ send-push → FCM → citizen phone notification
```

---

## 6. Auth model

- **Public app**: **no login**. Reads/writes go with the anon key. Trust is enforced by RLS + rate limits + captcha (§8).
- **Optional phone OTP**: if you want verified citizens, implement Supabase Phone Auth in the new app; the `submitted_by_user_id` column can then be populated for accountability.

Never ship the `service_role` key to the browser. Anon key only.

---

## 7. Migration to apply once (RLS + grants)

Run this in the Supabase SQL editor **before** the new app goes live. It enables anon inserts, storage writes, and public RPC access. Idempotent-safe with `IF NOT EXISTS` where possible.

```sql
-- ============ TRACK RPC (new) ============
CREATE OR REPLACE FUNCTION public.track_ticket(_ticket_no text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object(
       'kind','problem','ticket_no',ticket_no,'status',status,
       'title',title,'category',category,'city',city,'constituency',constituency,
       'created_at',created_at,'resolved_at',resolved_at,
       'updates',(SELECT jsonb_agg(jsonb_build_object(
                    'at',created_at,'status',status,'note',note,
                    'before_url',before_url,'after_url',after_url) ORDER BY created_at)
                  FROM problem_updates WHERE problem_id = p.id)
     ) FROM problems p WHERE ticket_no = _ticket_no),
    (SELECT jsonb_build_object(
       'kind','welfare','ticket_no',ticket_no,'status',status,
       'title',title,'scheme_type',scheme_type,'city',city,'constituency',constituency,
       'created_at',created_at,'resolved_at',resolved_at)
       FROM welfare_issues WHERE ticket_no = _ticket_no),
    (SELECT jsonb_build_object(
       'kind','corruption','ticket_no',ticket_no,'status',status,
       'department',department,'city',city,'constituency',constituency,'created_at',created_at)
       FROM corruption_reports WHERE ticket_no = _ticket_no)
  );
$$;
GRANT EXECUTE ON FUNCTION public.track_ticket(text) TO anon, authenticated;

-- ============ Anon INSERT policies ============
DROP POLICY IF EXISTS "anon insert problems" ON public.problems;
CREATE POLICY "anon insert problems" ON public.problems FOR INSERT TO anon
  WITH CHECK (status = 'submitted');
GRANT INSERT ON public.problems TO anon;

DROP POLICY IF EXISTS "anon insert welfare" ON public.welfare_issues;
CREATE POLICY "anon insert welfare" ON public.welfare_issues FOR INSERT TO anon
  WITH CHECK (status = 'submitted');
GRANT INSERT ON public.welfare_issues TO anon;

DROP POLICY IF EXISTS "anon insert suggestions" ON public.citizen_suggestions;
CREATE POLICY "anon insert suggestions" ON public.citizen_suggestions FOR INSERT TO anon
  WITH CHECK (status = 'submitted');
DROP POLICY IF EXISTS "anon read visible suggestions" ON public.citizen_suggestions;
CREATE POLICY "anon read visible suggestions" ON public.citizen_suggestions FOR SELECT TO anon
  USING (hidden = false);
GRANT INSERT, SELECT ON public.citizen_suggestions TO anon;

DROP POLICY IF EXISTS "anon read published works" ON public.completed_works;
CREATE POLICY "anon read published works" ON public.completed_works FOR SELECT TO anon
  USING (published = true);
GRANT SELECT ON public.completed_works TO anon;

DROP POLICY IF EXISTS "anon read public social" ON public.social_posts;
CREATE POLICY "anon read public social" ON public.social_posts FOR SELECT TO anon
  USING (visibility = 'public');
GRANT SELECT ON public.social_posts TO anon;

DROP POLICY IF EXISTS "anon register own token" ON public.notification_tokens;
CREATE POLICY "anon register own token" ON public.notification_tokens FOR INSERT TO anon
  WITH CHECK (role = 'citizen');
GRANT INSERT ON public.notification_tokens TO anon;

-- ============ Corruption RPC access ============
GRANT EXECUTE ON FUNCTION public.submit_corruption_report(
  text,text,text,text,text,numeric,date,text,text,text,text,text,text,boolean,text[]
) TO anon;

-- ============ Public read RPCs ============
GRANT EXECUTE ON FUNCTION public.get_public_stats()                    TO anon;
GRANT EXECUTE ON FUNCTION public.get_city_problem_counts()             TO anon;
GRANT EXECUTE ON FUNCTION public.get_constituency_problem_counts()     TO anon;
GRANT EXECUTE ON FUNCTION public.get_city_breakdown(text)              TO anon;
GRANT EXECUTE ON FUNCTION public.get_constituency_breakdown(text)      TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_cadres(text)               TO anon;
GRANT EXECUTE ON FUNCTION public.get_cadre_leaderboard(text,int)       TO anon;
GRANT EXECUTE ON FUNCTION public.get_team_leaderboard(text,int)        TO anon;

-- ============ Storage write from anon ============
DROP POLICY IF EXISTS "anon upload problem-media"     ON storage.objects;
CREATE POLICY "anon upload problem-media"     ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'problem-media');
DROP POLICY IF EXISTS "anon upload corruption-evid"   ON storage.objects;
CREATE POLICY "anon upload corruption-evid"   ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'corruption-evidence');
DROP POLICY IF EXISTS "anon upload voice-notes"       ON storage.objects;
CREATE POLICY "anon upload voice-notes"       ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'voice-notes');
```

Deliberately **not** granted to anon: `UPDATE`, `DELETE` on any table; read on `problems`/`welfare_issues`/`corruption_reports` (only via `track_ticket` RPC); anything under staff/cadre/blueprint tables.

Say the word and I'll ship this as a migration via the tool.

---

## 8. Abuse prevention (mandatory before launch)

Because the new app has no login, add these three layers:

1. **Cloudflare Turnstile** on every form. Verify token in a new edge function `verify-turnstile` (I can add it) before allowing the insert. Alternative: wrap all inserts in security-definer RPCs that take a `_captcha_token`.
2. **Per-IP rate limit** — 10 submissions/hour/IP via a small `rate_limits` table + trigger, or via Cloudflare rules on the fetch domain.
3. **Optional phone OTP** using Supabase Phone Auth if you want a verified citizen identity.

Also enable Supabase **Auth → Attack Protection** (leaked password check off — no passwords used publicly; keep Captcha on).

---

## 9. Deliverables checklist for the new stack

- [ ] Choose stack (Next.js App Router recommended for SSR+SEO; Astro if mostly static; Expo if mobile-first).
- [ ] Add `@supabase/supabase-js` (or use fetch directly).
- [ ] Environment: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Wire every screen from §4 to the endpoints in §3.
- [ ] Copy static reference data from Lovable repo (`src/lib/constituencies.ts` etc.).
- [ ] Apply migration in §7 to Supabase.
- [ ] Add Site URL + redirect URLs in Supabase Auth settings.
- [ ] Add Turnstile + rate limits (§8).
- [ ] Point domain (e.g. `makkalconnect.in`) to new host.
- [ ] Smoke test: submit report → appears in Lovable admin dashboard in <2 s → cadre closes → citizen tracking page shows resolved.
- [ ] In Lovable project, remove public pages (`Index`, `TrackProblem`, `LiveMap`, `Suggestions`, `SocialFeed`, `CompletedWorks*`, `KnowYourCadresPage`, `InstallApp`, `PrivacyPolicy`, `TermsOfService`) and redirect `/` → `/admin/login`. I can do this in a follow-up turn.

---

## 10. Quick reference — one-shot curl examples

Submit problem:
```bash
curl -X POST "$BASE/rest/v1/problems?select=id,ticket_no" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"reporter_name":"Ravi","reporter_phone":"+919000000000","city":"Chennai","constituency":"T.Nagar","category":"streetlight","title":"Light out","description":"Dark since 3 days","status":"submitted"}'
```

Track ticket:
```bash
curl -X POST "$BASE/rest/v1/rpc/track_ticket" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d '{"_ticket_no":"MC-2026-000123"}'
```

Upload photo:
```bash
curl -X POST "$BASE/storage/v1/object/problem-media/2026-07/$(uuidgen).jpg" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: image/jpeg" --data-binary @photo.jpg
```

Landing stats:
```bash
curl -X POST "$BASE/rest/v1/rpc/get_public_stats" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" -d '{}'
```

---

That's the complete contract. Once you approve, I can (a) apply the migration in §7, (b) add the `verify-turnstile` edge function, and (c) strip the public pages out of this Lovable project.
