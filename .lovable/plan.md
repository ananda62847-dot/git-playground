# Implementation Plan

## 1. PWA offline cache (login + main shell)
- Add `vite-plugin-pwa` with `generateSW`, `autoUpdate`, guarded registration wrapper (skip in Lovable preview/iframe/dev; respect `?sw=off`).
- Precache app shell; runtime caches: `NetworkFirst` for HTML navigations and Supabase GET reads; `CacheFirst` for hashed assets and images. Exclude `/~oauth`.

## 2. #track auto-fill + auto-click
- On the `/#track` route, read `auto=1` and `ticket=…` (or `t=…`) from URL; on mount, set ticket field value and programmatically click the Track button once. Guard to run only once per URL.
- Update `AdminSettings` "QR & Auto-Track" tab: QR now encodes `…/#track?ticket=<id>&auto=1`; provide a copyable curl example for tracking API too.

## 3. Cadre "Next Actions" / task titles in Tamil
- Wrap task titles and success criteria bullets everywhere they render (CadreMyTasks, CadreAIInbox next-actions, EvidenceProofUploader, BlueprintProgressStrip) with `useAutoTranslate` mapping.
- In Tasks tab, remove the "Update / Proof" button and keep only "View" (which already opens the update+proof drawer).

## 4. "Confirm Success" flow
- In cadre blueprint panel: when every task = `verified`/`completed`, show a `Confirm Success` button. Clicking sets parent report to a new `pending_admin_confirmation` status and inserts a `problem_updates` note.
- Admin side: badge on Problems/Welfare/Corruption/FundRequests list for rows in `pending_admin_confirmation`; detail modal shows a "Confirm Completion" primary button that flips status → `resolved`/`completed`.

## 5. AI evidence score – PDFs & video
- `ai-score-evidence` edge function: branch on mime; extract PDF text (unpdf) and video keyframe/audio (ffprobe metadata + Gemini Vision on the first frame via `image_url`) — fall back to filename+metadata scoring when extraction fails.
- Frontend: expand truncated explanation on 3-dot click (add `expanded` state, remove line-clamp when open).

## 6. Cadre media modal missing X
- `MediaPreviewModal` already has X; the cadre side uses a different lightweight viewer. Replace it with `MediaPreviewModal` (or add the same header bar with close/download).

## 7. Welfare Assign modal click-through
- Modal is behind detail modal overlay. Raise Assign modal to `z-[300]` and ensure its backdrop captures pointer events (`pointer-events-auto`).

## 8. Admin detail view: "Completed Flow" tab
- Add a `Completed Flow` tab in Problem/Welfare/Corruption/FundRequest detail modals: renders each completed task in order with its proof media as a scrollable flow (read-only). Uses `blueprint_tasks` + `blueprint_audit_log` media.

## 9. Ticket tracking – show completed task names
- On `/track` result: query completed `blueprint_tasks` for that report, render a compact checklist (task title only, ✓). Add curl snippet in Admin Settings for `GET /rest/v1/blueprint_tasks?...&status=eq.completed`.

## 10. Complaint PDF download in admin
- Reuse `src/lib/complaintPdf.ts` (`generateComplaintPdf`). Add "Download Complaint PDF" button in `ProblemDetailModal`, `WelfareDetailModal`, `FundRequestsManagement` detail. Skip corruption (per prior requirement).

## 11. Fix persistent English task/criteria strings
- Root cause: some strings arrive already partially Tamil (mixed) so `isAlreadyTamil` heuristic short-circuits translation. Change `useAutoTranslate` to translate when the string is **mostly** non-Tamil (Tamil chars <30%) instead of "any Tamil char present". Apply the hook to every place task titles/criteria/file-upload labels render.

## Files touched (high level)
- `vite.config.ts`, new `src/pwa/register.ts`, `src/main.tsx`
- `src/pages/TrackProblem.tsx`, `src/components/admin/AdminSettings.tsx`
- `src/components/cadre/CadreMyTasks.tsx`, `CadreAIInbox.tsx`, `src/components/blueprint/*`, `src/hooks/useAutoTranslate.ts`
- `src/components/blueprint/ResolutionBlueprintPanel.tsx` (Confirm Success)
- Admin modals: `ProblemDetailModal.tsx`, `WelfareDetailModal.tsx`, `CorruptionDetailModal.tsx`, `FundRequestsManagement.tsx` (+ badges, PDF btn, Completed Flow tab, Confirm Completion btn)
- `supabase/functions/ai-score-evidence/index.ts`
- Media viewer used in cadre pages → switch to `MediaPreviewModal`
- Welfare `AssignModal` z-index

## Non-code
- No DB schema changes required — reuse existing `status` text column with new value `pending_admin_confirmation`. If any status is an enum, migration will add the value.
