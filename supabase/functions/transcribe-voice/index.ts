// Edge function: transcribe a voice note using Lovable AI Gateway (Gemini multimodal),
// then map to {title, description}.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function fetchAudio(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch audio: ${res.status}`);
  const ct = res.headers.get("content-type") || "audio/webm";
  const buf = new Uint8Array(await res.arrayBuffer());
  // base64
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return { base64: btoa(bin), mime: ct };
}

async function transcribeWithGemini(LOVABLE_API_KEY: string, base64: string, mime: string, language?: string) {
  const langHint = language === "ta" ? "Tamil"
    : language === "en" ? "English"
    : "the original language (commonly Tamil, English, or Tanglish)";

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a civic-complaint assistant. The user sends an audio recording of a citizen complaint. " +
            `Transcribe it faithfully in ${langHint}, then produce a short action-oriented Title (<=80 chars) ` +
            "and a clear Description (1-3 sentences). Do not invent facts. Call the set_complaint tool.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Here is the voice note. Transcribe and structure it." },
            { type: "input_audio", input_audio: { data: base64, format: mime.includes("wav") ? "wav" : "webm" } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "set_complaint",
            description: "Return transcript, title and description for the citizen's complaint",
            parameters: {
              type: "object",
              properties: {
                transcript: { type: "string", description: "Full faithful transcript" },
                title: { type: "string", description: "Short title (<=80 chars)" },
                description: { type: "string", description: "Clear description" },
              },
              required: ["transcript", "title", "description"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "set_complaint" } },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Lovable AI error ${res.status}: ${t}`);
  }
  const j = await res.json();
  const args = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("No tool call returned from AI");
  const parsed = JSON.parse(args);
  return {
    transcript: String(parsed.transcript || ""),
    title: String(parsed.title || "").slice(0, 120),
    description: String(parsed.description || parsed.transcript || ""),
  };
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const { audioUrl, language } = await req.json();
    if (!audioUrl) return json({ error: "audioUrl required" }, 400);

    const { base64, mime } = await fetchAudio(audioUrl);

    // Lovable AI Gateway (Gemini) — supports audio + tool calling
    if (!LOVABLE_API_KEY) {
      return json({ error: "Lovable AI Gateway not configured." }, 500);
    }

    const out = await transcribeWithGemini(LOVABLE_API_KEY, base64, mime, language);
    if (out.transcript.trim().length > 0) return json(out);

    return json({ error: "Transcription failed." }, 500);
  } catch (e) {
    console.error("[transcribe-voice] error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
