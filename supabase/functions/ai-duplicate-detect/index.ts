// AI duplicate detection — on insert, find near-duplicates in same constituency/category within 7 days
// and attach as supporters. Conservative: only auto-merges when title+location overlap is high.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { problem_id } = await req.json();
    if (!problem_id) return new Response(JSON.stringify({ error: "problem_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: p } = await sb.from("problems").select("*").eq("id", problem_id).maybeSingle();
    if (!p) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const cutoff = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: candidates = [] } = await sb.from("problems")
      .select("id,ticket_no,title,description,latitude,longitude,status,created_at")
      .eq("constituency", p.constituency).eq("category", p.category)
      .neq("id", problem_id).gte("created_at", cutoff).limit(50);

    const matches: any[] = [];
    for (const c of (candidates as any[])) {
      const dist = (p.latitude && c.latitude) ? haversine(p.latitude, p.longitude, c.latitude, c.longitude) : 9999;
      const titleSim = jaccard(p.title || "", c.title || "");
      if (dist < 0.5 && titleSim > 0.5) matches.push({ ...c, dist, titleSim });
    }

    if (matches.length === 0) return new Response(JSON.stringify({ duplicates: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const primary = matches.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))[0];
    // Mark this report as duplicate (cannot insert into problem_supporters without supporter contact info)
    await sb.from("problems").update({ status: "duplicate" }).eq("id", problem_id);

    await sb.from("ai_decisions").insert({
      agent_type: "duplicate_detect", entity_type: "problem", entity_id: problem_id, action: "merged_as_duplicate",
      reason: `Merged into ${primary.ticket_no} (dist ${primary.dist.toFixed(2)}km, title sim ${primary.titleSim.toFixed(2)})`,
      status: "auto_applied", confidence: Math.round(primary.titleSim * 100), metadata: { primary_id: primary.id, matches: matches.length },
      applied_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ duplicates: matches.length, primary: primary.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function haversine(la1: number, lo1: number, la2: number, lo2: number) {
  const R = 6371, t = (d: number) => d * Math.PI / 180;
  const dLa = t(la2 - la1), dLo = t(lo2 - lo1);
  const a = Math.sin(dLa/2)**2 + Math.cos(t(la1)) * Math.cos(t(la2)) * Math.sin(dLo/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function jaccard(a: string, b: string) {
  const A = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const B = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  const inter = [...A].filter(x => B.has(x)).length;
  const uni = new Set([...A, ...B]).size;
  return uni ? inter / uni : 0;
}
