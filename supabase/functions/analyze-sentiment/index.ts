// Sentiment + intent + emotion analysis for citizen feedback (Tamil/English).
// Uses Lovable AI with structured tool-call output. Keyword pass acts as fast-path + fallback.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Sentiment = "positive" | "neutral" | "negative" | "angry" | "demanding";
type Emotion = "joy" | "trust" | "fear" | "sadness" | "anger" | "frustration" | "hope" | "neutral";
type Intent = "complaint" | "request" | "praise" | "suggestion" | "report_incident" | "question" | "other";

interface Result {
  sentiment: Sentiment;
  score: number;             // 0=very negative .. 1=very positive
  confidence: number;        // 0..1
  emotion: Emotion;
  intent: Intent;
  keywords: string[];
  language: "ta" | "en" | "mixed";
  summary?: string;
}

const kw = {
  angry: ["கோபம்","வெறுப்பு","கொடுமை","அநீதி","ஏமாற்றம்","அவமானம்","அழிவு","furious","outrage","disgusting","worst","hate","corrupt","scam","fraud","cheating","injustice","destroy"],
  negative: ["பிரச்சனை","கஷ்டம்","சிரமம்","தாமதம்","மோசம்","குறை","போதாது","problem","issue","bad","poor","delay","lack","shortage","broken","failed","difficult","suffering","complaint","grievance"],
  demanding: ["உடனடி","தேவை","கோரிக்கை","வேண்டும்","நடவடிக்கை","immediately","urgent","demand","must","require","action now","please fix","solve","implement"],
  positive: ["நன்றி","நல்ல","சிறந்த","ஆதரவு","மகிழ்ச்சி","வாழ்த்து","பாராட்டு","good","great","excellent","thank","appreciate","support","happy","wonderful","amazing","best","proud"],
} as const;

const scoreMap: Record<Sentiment, number> = { angry: 0.1, negative: 0.3, demanding: 0.45, neutral: 0.5, positive: 0.85 };

function detectLanguage(text: string): Result["language"] {
  const hasTamil = /[\u0B80-\u0BFF]/.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);
  if (hasTamil && hasLatin) return "mixed";
  return hasTamil ? "ta" : "en";
}

function keywordPass(text: string): { sentiment: Sentiment; hits: Record<string, number>; matched: string[] } {
  const lower = text.toLowerCase();
  const hits: Record<string, number> = { angry: 0, negative: 0, demanding: 0, positive: 0 };
  const matched: string[] = [];
  for (const [cat, words] of Object.entries(kw)) {
    for (const w of words) {
      if (lower.includes(w.toLowerCase())) {
        hits[cat]++;
        matched.push(w);
      }
    }
  }
  let sentiment: Sentiment = "neutral";
  const max = Math.max(...Object.values(hits));
  if (max > 0) {
    // priority: angry > demanding > negative > positive (if tie, escalate)
    if (hits.angry === max) sentiment = "angry";
    else if (hits.demanding === max) sentiment = "demanding";
    else if (hits.negative === max) sentiment = "negative";
    else if (hits.positive === max) sentiment = "positive";
  }
  return { sentiment, hits, matched: [...new Set(matched)].slice(0, 8) };
}

async function aiAnalyze(text: string, type: string): Promise<Result | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;

  const system = `You analyze Tamil/English citizen ${type} for a Tamil Nadu civic platform.
Return STRICT structured output via the analyze tool. Be precise and culturally aware.
- sentiment: positive | neutral | negative | angry | demanding
- score: 0 (very negative) to 1 (very positive)
- confidence: 0-1
- emotion: one of joy, trust, fear, sadness, anger, frustration, hope, neutral
- intent: complaint, request, praise, suggestion, report_incident, question, other
- keywords: up to 6 salient words/phrases from the text (preserve original language)
- language: ta, en, or mixed
- summary: 1 short sentence in English (max 140 chars)`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: text.slice(0, 1500) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze",
            description: "Return structured sentiment analysis",
            parameters: {
              type: "object",
              properties: {
                sentiment: { type: "string", enum: ["positive","neutral","negative","angry","demanding"] },
                score: { type: "number" },
                confidence: { type: "number" },
                emotion: { type: "string", enum: ["joy","trust","fear","sadness","anger","frustration","hope","neutral"] },
                intent: { type: "string", enum: ["complaint","request","praise","suggestion","report_incident","question","other"] },
                keywords: { type: "array", items: { type: "string" } },
                language: { type: "string", enum: ["ta","en","mixed"] },
                summary: { type: "string" },
              },
              required: ["sentiment","score","confidence","emotion","intent","keywords","language"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "analyze" } },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return null;
    const parsed = JSON.parse(args);
    return {
      sentiment: parsed.sentiment,
      score: Math.max(0, Math.min(1, Number(parsed.score) || 0.5)),
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
      emotion: parsed.emotion || "neutral",
      intent: parsed.intent || "other",
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 6) : [],
      language: parsed.language || detectLanguage(text),
      summary: parsed.summary || undefined,
    };
  } catch (e) {
    console.error("ai sentiment failed", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, type = "suggestion" } = await req.json();
    if (!text || text.length < 3) {
      const r: Result = { sentiment: "neutral", score: 0.5, confidence: 0.3, emotion: "neutral", intent: "other", keywords: [], language: "en" };
      return new Response(JSON.stringify(r), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const kwRes = keywordPass(text);
    const ai = await aiAnalyze(text, type);

    // Prefer AI but boost confidence when keywords agree
    const out: Result = ai ?? {
      sentiment: kwRes.sentiment,
      score: scoreMap[kwRes.sentiment],
      confidence: kwRes.matched.length ? Math.min(0.85, 0.4 + kwRes.matched.length * 0.1) : 0.3,
      emotion: kwRes.sentiment === "angry" ? "anger"
        : kwRes.sentiment === "negative" ? "frustration"
        : kwRes.sentiment === "positive" ? "joy"
        : kwRes.sentiment === "demanding" ? "frustration"
        : "neutral",
      intent: kwRes.sentiment === "positive" ? "praise"
        : kwRes.sentiment === "demanding" ? "request"
        : kwRes.sentiment === "neutral" ? "other"
        : "complaint",
      keywords: kwRes.matched,
      language: detectLanguage(text),
    };

    if (ai && kwRes.sentiment !== "neutral" && kwRes.sentiment === ai.sentiment) {
      out.confidence = Math.min(1, ai.confidence + 0.1);
    }

    return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(
      JSON.stringify({ sentiment: "neutral", score: 0.5, confidence: 0.2, emotion: "neutral", intent: "other", keywords: [], language: "en", error: e?.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
