// AI-drafted DOCX completion report. Generates a polished closure document with timeline,
// before/after, financial details, signatures. Uploaded to completed-works bucket.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, ImageRun, WidthType, BorderStyle, ShadingType } from "npm:docx@9";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { problem_id } = await req.json();
    if (!problem_id) return new Response(JSON.stringify({ error: "problem_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: p } = await sb.from("problems").select("*").eq("id", problem_id).maybeSingle();
    if (!p) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const [{ data: updates = [] }, { data: assignments = [] }, { data: escs = [] }, { data: media = [] }] = await Promise.all([
      sb.from("problem_updates").select("*").eq("problem_id", problem_id).order("created_at"),
      sb.from("problem_assignments").select("*, cadre:cadres(name,phone), team:teams(name)").eq("problem_id", problem_id).order("created_at"),
      sb.from("escalations").select("*").eq("problem_id", problem_id).order("created_at"),
      sb.from("problem_media").select("*").eq("problem_id", problem_id),
    ]);

    // Optional AI polish for narrative summary
    let summary = p.description || "";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Write a 4-6 sentence formal closure summary for a Tamil Nadu citizen grievance. Plain prose. No markdown." },
              { role: "user", content: JSON.stringify({ title: p.title, description: p.description, category: p.category, location: [p.area, p.constituency].filter(Boolean).join(", "), reported: p.created_at, resolved: p.resolved_at, updates: (updates as any[]).map((u: any) => u.note).filter(Boolean) }) },
            ],
          }),
        });
        if (r.ok) {
          const d = await r.json();
          const t = d?.choices?.[0]?.message?.content;
          if (t) summary = String(t);
        }
      } catch (_) { /* ignore */ }
    }

    // Try to embed after image (best-effort)
    let afterBuf: Uint8Array | null = null;
    const afterUrl = (updates as any[]).reverse().find((u: any) => u.after_url)?.after_url;
    if (afterUrl) {
      try {
        const ir = await fetch(afterUrl);
        if (ir.ok) afterBuf = new Uint8Array(await ir.arrayBuffer());
      } catch (_) { /* ignore */ }
    }
    let beforeBuf: Uint8Array | null = null;
    const beforeUrl = (updates as any[]).find((u: any) => u.before_url)?.before_url || (media as any[]).find((m: any) => m.media_type === "image")?.url;
    if (beforeUrl) {
      try {
        const ir = await fetch(beforeUrl);
        if (ir.ok) beforeBuf = new Uint8Array(await ir.arrayBuffer());
      } catch (_) { /* ignore */ }
    }

    const fmt = (s?: string | null) => s ? new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—";

    const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
    const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

    const tlRows = [
      ["Reported", fmt(p.created_at)],
      ["Acknowledged", fmt((updates as any[]).find((u: any) => u.status === "acknowledged")?.created_at)],
      ["In Progress", fmt((updates as any[]).find((u: any) => u.status === "in_progress")?.created_at)],
      ["Resolved", fmt(p.resolved_at)],
    ];

    const updateRows = (updates as any[]).map((u: any) => [fmt(u.created_at), u.status ?? "—", u.note ?? ""]);

    const imageRow = (label: string, buf: Uint8Array | null) => new TableCell({
      borders: cellBorders, width: { size: 4500, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [
        new Paragraph({ children: [new TextRun({ text: label, bold: true })] }),
        buf ? new Paragraph({ children: [new ImageRun({ type: "png", data: buf, transformation: { width: 220, height: 165 }, altText: { title: label, description: label, name: label } })] })
            : new Paragraph({ children: [new TextRun({ text: "(no image)", italics: true })] }),
      ],
    });

    const doc = new Document({
      sections: [{
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MAKKAL CONNECT", bold: true, size: 28, color: "B91C1C" })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Grievance Closure Report", size: 22 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Ticket ${p.ticket_no ?? "—"} · ${fmt(new Date().toISOString())}`, size: 18, color: "666666" })] }),
          new Paragraph({ children: [new TextRun(" ")] }),

          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "1. Summary" })] }),
          new Paragraph({ children: [new TextRun({ text: p.title || "Untitled", bold: true })] }),
          new Paragraph({ children: [new TextRun(summary)] }),
          new Paragraph({ children: [new TextRun(" ")] }),

          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "2. Report Details" })] }),
          new Table({
            width: { size: 9360, type: WidthType.DXA }, columnWidths: [3120, 6240],
            rows: [
              ["Category", p.category || "—"],
              ["Department", p.department || "—"],
              ["Location", [p.area, p.constituency, p.city].filter(Boolean).join(", ") || "—"],
              ["Urgency", p.urgency || "—"],
              ["Status", p.status || "—"],
            ].map(([k, v]) => new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, shading: { fill: "F3F4F6", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: k, bold: true })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6240, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun(String(v))] })] }),
            ] })),
          }),
          new Paragraph({ children: [new TextRun(" ")] }),

          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "3. Timeline" })] }),
          new Table({
            width: { size: 9360, type: WidthType.DXA }, columnWidths: [3120, 6240],
            rows: tlRows.map(([k, v]) => new TableRow({ children: [
              new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, shading: { fill: "F3F4F6", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: k, bold: true })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6240, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun(String(v))] })] }),
            ] })),
          }),
          new Paragraph({ children: [new TextRun(" ")] }),

          ...(updateRows.length ? [
            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Progress Updates" })] }),
            new Table({
              width: { size: 9360, type: WidthType.DXA }, columnWidths: [2200, 1800, 5360],
              rows: [
                new TableRow({ children: ["When", "Status", "Note"].map((h) => new TableCell({
                  borders: cellBorders, width: { size: h === "Note" ? 5360 : h === "Status" ? 1800 : 2200, type: WidthType.DXA },
                  shading: { fill: "1F2937", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF" })] })],
                })) }),
                ...updateRows.map((r) => new TableRow({ children: r.map((c, i) => new TableCell({
                  borders: cellBorders, width: { size: i === 2 ? 5360 : i === 1 ? 1800 : 2200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun(String(c))] })],
                })) })),
              ],
            }),
            new Paragraph({ children: [new TextRun(" ")] }),
          ] : []),

          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "4. Before & After" })] }),
          new Table({
            width: { size: 9360, type: WidthType.DXA }, columnWidths: [4500, 4500],
            rows: [new TableRow({ children: [imageRow("BEFORE", beforeBuf), imageRow("AFTER", afterBuf)] })],
          }),
          new Paragraph({ children: [new TextRun(" ")] }),

          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "5. Team & Escalations" })] }),
          ...(assignments as any[]).map((a: any) => new Paragraph({ children: [new TextRun(`Assigned to: ${a.cadre?.name || a.team?.name || "—"}${a.claimed_at ? " · Claimed " + fmt(a.claimed_at) : ""}`)] })),
          ...(escs.length ? [new Paragraph({ children: [new TextRun({ text: `Escalations: ${escs.length}`, bold: true })] })] : []),
          new Paragraph({ children: [new TextRun(" ")] }),

          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "6. Resolution" })] }),
          new Paragraph({ children: [new TextRun(`Resolved at: ${fmt(p.resolved_at)}`)] }),
          p.satisfaction_rating ? new Paragraph({ children: [new TextRun(`Citizen rating: ${"★".repeat(p.satisfaction_rating)} (${p.satisfaction_rating}/5)`)] }) : new Paragraph({ children: [new TextRun("Awaiting citizen confirmation.")] }),

          new Paragraph({ children: [new TextRun(" ")] }),
          new Paragraph({ children: [new TextRun(" ")] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "— Generated by Makkal Connect AI", italics: true, color: "666666" })] }),
        ],
      }],
    });

    const buf = await Packer.toBuffer(doc);
    const path = `closure-reports/${p.ticket_no || problem_id}-${Date.now()}.docx`;
    const { error: upErr } = await sb.storage.from("completed-works").upload(path, buf, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", upsert: true,
    });
    if (upErr) throw upErr;
    const { data: pub } = sb.storage.from("completed-works").getPublicUrl(path);

    await sb.from("problems").update({ completion_report_url: pub.publicUrl }).eq("id", problem_id);
    await sb.from("ai_decisions").insert({
      agent_type: "draft_report", entity_type: "problem", entity_id: problem_id, action: "report_generated",
      reason: `Closure report drafted (${(buf.length / 1024).toFixed(0)} KB)`, status: "auto_applied", confidence: 100,
      metadata: { url: pub.publicUrl, path }, applied_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ url: pub.publicUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
