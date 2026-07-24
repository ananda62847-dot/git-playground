// Batch text translator using Lovable AI Gateway (Gemini flash) with translations_cache.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(s: string) {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { items, target = "ta" } = await req.json() as { items: { id: string; text: string }[]; target?: string };
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ results: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // hash + cache lookup
    const withHash = await Promise.all(items.map(async i => ({ ...i, hash: await sha256(`${target}::${i.text}`) })));
    const hashes = withHash.map(x => x.hash);
    const { data: cached } = await supabase.from("translations_cache").select("source_hash, translated").in("source_hash", hashes).eq("target_lang", target);
    const cacheMap = new Map((cached || []).map(r => [r.source_hash, r.translated]));

    const missing = withHash.filter(x => !cacheMap.has(x.hash));
    let newTranslations: { hash: string; translated: string }[] = [];

    if (missing.length > 0) {
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
      const prompt = `Translate each of the following JSON array entries to ${target === "ta" ? "Tamil" : target}. Preserve meaning and tone. Return ONLY a JSON array of the same length with translated strings, no explanations.\n\nINPUT:\n${JSON.stringify(missing.map(m => m.text))}`;
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a professional Tamil translator for government/civic content. Output valid JSON only." },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!resp.ok) {
        const errTxt = await resp.text();
        console.error("gateway error", resp.status, errTxt);
        throw new Error(`gateway ${resp.status}`);
      }
      const j = await resp.json();
      const raw = j.choices?.[0]?.message?.content ?? "[]";
      const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
      let arr: string[] = [];
      try { arr = JSON.parse(cleaned); } catch { arr = missing.map(m => m.text); }
      newTranslations = missing.map((m, i) => ({ hash: m.hash, translated: arr[i] ?? m.text }));
      // cache write (best-effort)
      await supabase.from("translations_cache").upsert(
        newTranslations.map(n => ({ source_hash: n.hash, target_lang: target, translated: n.translated })),
        { onConflict: "source_hash,target_lang" },
      );
      newTranslations.forEach(n => cacheMap.set(n.hash, n.translated));
    }

    const results = withHash.map(x => ({ id: x.id, translated: cacheMap.get(x.hash) || x.text }));
    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message, results: [] }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});