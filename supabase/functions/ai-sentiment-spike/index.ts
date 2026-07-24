// AI sentiment-spike detector — hourly cron.
// Looks at last 24h of problems per (constituency, category) vs prior 7-day baseline.
// If count > 2σ above baseline, open an escalation flagged 'sentiment_spike'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const since24 = new Date(Date.now() - 86400_000).toISOString();
  const since7d = new Date(Date.now() - 7 * 86400_000).toISOString();

  const { data: recent = [] } = await sb.from("problems").select("constituency,category,id").gte("created_at", since24);
  const { data: baseline = [] } = await sb.from("problems").select("constituency,category,created_at").gte("created_at", since7d).lt("created_at", since24);

  // Build per-day counts for baseline
  const baseGroups: Record<string, number[]> = {};
  (baseline as any[]).forEach((p) => {
    const k = `${p.constituency}|${p.category}`;
    const day = new Date(p.created_at).toISOString().slice(0, 10);
    if (!baseGroups[k]) baseGroups[k] = [];
    const arr = baseGroups[k];
    const last = (arr as any).__last;
    if ((arr as any).__day === day) arr[arr.length - 1]++;
    else { arr.push(1); (arr as any).__day = day; }
  });

  const recentCounts: Record<string, number> = {};
  (recent as any[]).forEach((p) => { const k = `${p.constituency}|${p.category}`; recentCounts[k] = (recentCounts[k] ?? 0) + 1; });

  const spikes: any[] = [];
  for (const [k, c] of Object.entries(recentCounts)) {
    const series = baseGroups[k] || [0];
    const mean = series.reduce((s, v) => s + v, 0) / series.length;
    const sd = Math.sqrt(series.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(series.length, 1));
    if (c > mean + 2 * (sd || 1) && c >= 5) spikes.push({ k, c, mean, sd });
  }

  for (const s of spikes) {
    const [constituency, category] = s.k.split("|");
    // Don't duplicate within 24h
    const { data: existing } = await sb.from("escalations").select("id")
      .eq("severity", "high").gte("created_at", since24)
      .ilike("reason", `%Sentiment spike%${constituency}%${category}%`).limit(1);
    if (existing && existing.length) continue;

    const { data: pickProblem } = await sb.from("problems").select("id")
      .eq("constituency", constituency).eq("category", category).gte("created_at", since24).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!pickProblem) continue;

    await sb.from("escalations").insert({
      problem_id: pickProblem.id, severity: "high", status: "open", to_level: "constituency",
      reason: `Sentiment spike — ${s.c} reports in ${constituency}/${category} (baseline ${s.mean.toFixed(1)}±${s.sd.toFixed(1)})`,
    });
    await sb.from("ai_decisions").insert({
      agent_type: "sentiment_spike", entity_type: "problem", entity_id: pickProblem.id, action: "escalation_opened",
      reason: `Spike detected`, status: "auto_applied", confidence: 90, metadata: { count: s.c, mean: s.mean, sd: s.sd, constituency, category },
      applied_at: new Date().toISOString(),
    });
  }

  return new Response(JSON.stringify({ spikes: spikes.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
