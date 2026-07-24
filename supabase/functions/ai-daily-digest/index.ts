// AI daily digest — 08:00 IST. Per-constituency summary delivered to all admins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const since = new Date(Date.now() - 86400_000).toISOString();
  const { data: probs = [] } = await sb.from("problems")
    .select("id,status,constituency,category,created_at,resolved_at").gte("created_at", since);

  const byCons: Record<string, { total: number; resolved: number; overdue: number; categories: Record<string, number> }> = {};
  (probs as any[]).forEach((p) => {
    const k = p.constituency || "Unknown";
    if (!byCons[k]) byCons[k] = { total: 0, resolved: 0, overdue: 0, categories: {} };
    byCons[k].total++;
    if (["resolved", "completed", "citizen_confirmed"].includes(p.status)) byCons[k].resolved++;
    byCons[k].categories[p.category || "other"] = (byCons[k].categories[p.category || "other"] || 0) + 1;
  });

  // Get all open escalations per constituency
  const { data: escs = [] } = await sb.from("escalations").select("id,problem:problems(constituency)").eq("status", "open");
  (escs as any[]).forEach((e) => {
    const k = e.problem?.constituency || "Unknown";
    if (byCons[k]) byCons[k].overdue++;
  });

  // Get admins per constituency
  const { data: mods = [] } = await sb.from("moderator_constituencies").select("user_id,constituency");
  const { data: superAdmins = [] } = await sb.from("user_roles").select("user_id").eq("role", "admin");

  let sent = 0;
  for (const [cons, stats] of Object.entries(byCons)) {
    const top = Object.entries(stats.categories).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`).join(", ");
    const title = `🌅 Daily digest — ${cons}`;
    const body = `${stats.total} new · ${stats.resolved} resolved · ${stats.overdue} escalations open\nTop: ${top}`;
    const targets = [
      ...(mods as any[]).filter((m) => m.constituency === cons).map((m) => m.user_id),
      ...(superAdmins as any[]).map((a) => a.user_id),
    ];
    for (const uid of Array.from(new Set(targets))) {
      await sb.from("notifications").insert({
        user_id: uid, title, body, type: "daily_digest", constituency: cons, data: stats,
      });
      sent++;
    }
  }

  await sb.from("ai_decisions").insert({
    agent_type: "daily_digest", entity_type: "system", action: "digest_sent",
    reason: `Sent ${sent} digest notifications across ${Object.keys(byCons).length} constituencies`,
    status: "auto_applied", confidence: 100, metadata: { sent, constituencies: Object.keys(byCons).length },
    applied_at: new Date().toISOString(),
  });

  return new Response(JSON.stringify({ sent, constituencies: Object.keys(byCons).length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
