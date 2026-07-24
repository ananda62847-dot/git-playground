// Citizen Pulse Agent — samples recent citizen suggestions + problems,
// calls analyze-sentiment per item, aggregates a per-constituency mood score.
// Logs one ai_decision per constituency snapshot.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Item { text: string; constituency: string | null; source: string; }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const sinceIso = new Date(Date.now() - 24 * 3600_000).toISOString();

    const [{ data: sugs }, { data: probs }] = await Promise.all([
      supabase.from('citizen_suggestions').select('description, constituency').gte('created_at', sinceIso).limit(60),
      supabase.from('problems').select('description, constituency').gte('created_at', sinceIso).limit(60),
    ]);

    const items: Item[] = [
      ...((sugs ?? []).map(s => ({ text: s.description ?? '', constituency: s.constituency ?? null, source: 'suggestion' }))),
      ...((probs ?? []).map(p => ({ text: p.description ?? '', constituency: p.constituency ?? null, source: 'problem' }))),
    ].filter(i => i.text && i.text.length > 8);

    if (items.length === 0) {
      return new Response(JSON.stringify({ analyzed: 0, snapshots: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Analyze each (capped at 30 to keep within edge-fn budget)
    const sample = items.slice(0, 30);
    const results = await Promise.all(sample.map(async (i) => {
      try {
        const { data } = await supabase.functions.invoke('analyze-sentiment', { body: { text: i.text, type: i.source } });
        return { i, r: data };
      } catch { return { i, r: null }; }
    }));

    // Aggregate by constituency
    const buckets = new Map<string, { scores: number[]; angry: number; demanding: number; positive: number; total: number; topKw: string[] }>();
    for (const { i, r } of results) {
      if (!r) continue;
      const key = i.constituency || 'unknown';
      const b = buckets.get(key) ?? { scores: [], angry: 0, demanding: 0, positive: 0, total: 0, topKw: [] };
      b.scores.push(Number(r.score) || 0.5);
      if (r.sentiment === 'angry') b.angry++;
      if (r.sentiment === 'demanding') b.demanding++;
      if (r.sentiment === 'positive') b.positive++;
      b.total++;
      if (Array.isArray(r.keywords)) b.topKw.push(...r.keywords);
      buckets.set(key, b);
    }

    let snapshots = 0;
    for (const [constituency, b] of buckets) {
      const mood = Math.round((b.scores.reduce((s, n) => s + n, 0) / Math.max(1, b.scores.length)) * 100);
      const tension = Math.round(((b.angry + b.demanding) / Math.max(1, b.total)) * 100);
      const kwCount: Record<string, number> = {};
      b.topKw.forEach(k => { kwCount[k] = (kwCount[k] ?? 0) + 1; });
      const topKw = Object.entries(kwCount).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k])=>k);

      await supabase.from('ai_decisions' as any).insert({
        agent_type: 'sentiment',
        entity_type: 'constituency',
        entity_id: '00000000-0000-0000-0000-000000000000',
        action: 'pulse_snapshot',
        reason: `${constituency}: mood ${mood}/100, tension ${tension}%. Top: ${topKw.join(', ') || '—'}.`,
        confidence: Math.min(99, 50 + b.total * 3),
        status: 'auto_applied',
        applied_at: new Date().toISOString(),
        score_breakdown: { mood, tension, positive: b.positive, angry: b.angry, demanding: b.demanding },
        metadata: { constituency, total_samples: b.total, top_keywords: topKw, window_hours: 24 },
      });
      snapshots++;

      if (tension >= 60 && b.total >= 3) {
        await supabase.functions.invoke('send-push', {
          body: {
            title: `📈 Rising tension in ${constituency}`,
            body: `Citizen tension ${tension}% across ${b.total} recent items. Top: ${topKw.slice(0,3).join(', ')}.`,
            type: 'ai_pulse', severity: tension >= 80 ? 'critical' : 'high',
            url: `/admin`,
            target: { role: 'constituency_admin', constituency },
          },
        }).catch(() => {});
      }
    }

    return new Response(JSON.stringify({ analyzed: results.length, snapshots }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[ai-citizen-pulse]', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
