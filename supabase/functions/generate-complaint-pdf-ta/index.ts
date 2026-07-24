// Server-side Tamil complaint PDF generator.
// Uses pdf-lib + Noto Sans Tamil (fetched at cold start & cached) so every glyph renders correctly.
// POST body: { report_type: 'problem'|'welfare'|'fund'|'corruption', report_id: string, track_url?: string }
// Returns: application/pdf

// Polyfill regeneratorRuntime for fontkit's Tamil layout engine (uses generators via regenerator).
import "https://esm.sh/regenerator-runtime@0.14.1/runtime.js";
// @ts-ignore
(globalThis as any).regeneratorRuntime = (globalThis as any).regeneratorRuntime;
import { PDFDocument, rgb } from "https://esm.sh/pdf-lib@1.17.1?target=deno";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0?target=deno";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
import { qrcode as makeQr } from "https://deno.land/x/qrcode@v2.0.0/mod.ts";

const FONT_URL_REG =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansTamil/NotoSansTamil-Regular.ttf";
const FONT_URL_BOLD =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansTamil/NotoSansTamil-Bold.ttf";

let fontRegCache: Uint8Array | null = null;
let fontBoldCache: Uint8Array | null = null;

async function loadFonts() {
  if (!fontRegCache) fontRegCache = new Uint8Array(await (await fetch(FONT_URL_REG)).arrayBuffer());
  if (!fontBoldCache) fontBoldCache = new Uint8Array(await (await fetch(FONT_URL_BOLD)).arrayBuffer());
  return { reg: fontRegCache, bold: fontBoldCache };
}

// ---- Tamil labels + translations ----
const L = {
  brand: "மக்கள் கனெக்ட் – கோயம்புத்தூர்",
  subtitle: "மின்னணு குடிமக்கள் சேவை மற்றும் பொது குறை தீர்வு தளம்",
  ticket: "புகார் எண்",
  submitted: "சமர்ப்பித்த நேரம்",
  status: "நிலை",
  citizen: "குடிமகன் தகவல்",
  name: "பெயர்",
  phone: "தொலைபேசி",
  age: "வயது",
  constituency: "தொகுதி",
  belongs: "தொகுதியைச் சேர்ந்தவரா",
  area: "பகுதி",
  city: "மாவட்டம்",
  pincode: "அஞ்சல் குறியீடு",
  complaint: "புகார் விவரங்கள்",
  department: "துறை",
  category: "வகை",
  urgency: "அவசர நிலை",
  title: "தலைப்பு",
  description: "விவரமான விளக்கம்",
  location: "இடம் விவரம்",
  gps: "அட்சரேகை / தீர்க்கரேகை",
  evidence: "இணைக்கப்பட்ட ஆதாரங்கள்",
  evidenceCount: (n: number) => `${n} கோப்பு(கள்) இணைக்கப்பட்டுள்ளது.`,
  noEvidence: "எந்த ஆதாரமும் இணைக்கப்படவில்லை.",
  voice: "ஒரு குரல் குறிப்பு இணைக்கப்பட்டுள்ளது.",
  track: "புகாரின் நிலையை கண்காணிக்க",
  trackHelp: "QR குறியீட்டை ஸ்கேன் செய்யுங்கள் அல்லது புகார் எண்ணைப் பயன்படுத்துங்கள்.",
  footer1: "இந்த ஆவணம் உங்கள் புகார் வெற்றிகரமாக பதிவு செய்யப்பட்டதை உறுதிப்படுத்துகிறது.",
  footer2: "மக்கள் கனெக்ட் – குடிமக்கள் சேவை மற்றும் பொது தீர்வு",
  yes: "ஆம்",
  no: "இல்லை",
  submittedStatus: "சமர்ப்பிக்கப்பட்டது",
};

function truthy(v: unknown) { return v !== null && v !== undefined && String(v).trim() !== ""; }
function maskPhone(p?: string) {
  if (!p) return "-";
  const d = p.replace(/\D/g, "");
  if (d.length < 6) return p;
  return `+91 ${d.slice(0, 2)}XXX XX${d.slice(-2)}`;
}

async function fetchReport(sb: any, type: string, id: string) {
  const table =
    type === "welfare" ? "welfare_issues"
      : type === "fund" ? "fund_assistance_requests"
      : type === "corruption" ? "corruption_reports"
      : "problems";
  const { data, error } = await sb.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return { table, row: data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const { report_type, report_id, track_url } = body || {};
    if (!report_type || !report_id) {
      return new Response(JSON.stringify({ error: "report_type and report_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { row } = await fetchReport(sb, report_type, report_id);
    if (!row) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ticket = row.ticket_no || row.id;
    const trackUrl = track_url || `https://makkal-connect.tvk.upcurv.in/#track?ticket=${encodeURIComponent(ticket)}&auto=1`;

    const { reg, bold } = await loadFonts();
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit as any);
    const font = await pdf.embedFont(reg);
    const fontB = await pdf.embedFont(bold);

    const page = pdf.addPage([595, 842]); // A4
    const W = 595, M = 40;
    let y = 800;
    const maroon = rgb(0.64, 0.09, 0.29);
    const gray = rgb(0.25, 0.25, 0.25);
    const dark = rgb(0.13, 0.13, 0.13);

    const drawText = (t: string, x: number, yPos: number, size = 10, opts: { bold?: boolean; color?: any; align?: "left" | "center" } = {}) => {
      const f = opts.bold ? fontB : font;
      const w = f.widthOfTextAtSize(t, size);
      const xx = opts.align === "center" ? x - w / 2 : x;
      page.drawText(t, { x: xx, y: yPos, size, font: f, color: opts.color ?? dark });
    };

    // Header
    page.drawRectangle({ x: M, y: y - 22, width: W - 2 * M, height: 32, borderColor: maroon, borderWidth: 1.4 });
    drawText(L.brand, W / 2, y - 8, 16, { bold: true, color: maroon, align: "center" });
    y -= 30;
    drawText(L.subtitle, W / 2, y - 6, 10, { color: gray, align: "center" });
    y -= 22;

    // Strip
    const stripH = 40, colW = (W - 2 * M) / 3;
    page.drawRectangle({ x: M, y: y - stripH, width: W - 2 * M, height: stripH, color: rgb(1, 0.96, 0.96), borderColor: rgb(0.9, 0.75, 0.75), borderWidth: 0.7 });
    const strip = (label: string, val: string, i: number, color = dark) => {
      const cx = M + i * colW + colW / 2;
      drawText(label, cx, y - 14, 9, { bold: true, color: maroon, align: "center" });
      drawText(val, cx, y - 30, 11, { color, align: "center" });
    };
    strip(L.ticket, String(ticket), 0);
    strip(L.submitted, new Date(row.created_at).toLocaleString("ta-IN"), 1, gray);
    strip(L.status, row.status ? String(row.status) : L.submittedStatus, 2, rgb(0.07, 0.47, 0.2));
    y -= (stripH + 18);

    // Sections
    const section = (t: string) => {
      drawText(t, M, y, 13, { bold: true, color: maroon });
      y -= 12;
    };
    const wrap = (t: string, maxW: number, size = 10) => {
      const out: string[] = [];
      const words = String(t || "-").split(/\s+/);
      let line = "";
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(test, size) <= maxW) line = test;
        else { if (line) out.push(line); line = w; }
      }
      if (line) out.push(line);
      return out.length ? out : ["-"];
    };
    const kvTable = (rows: [string, string][]) => {
      const c1 = 150, rowH = 20;
      for (const [k, v] of rows) {
        page.drawRectangle({ x: M, y: y - rowH, width: W - 2 * M, height: rowH, borderColor: rgb(0.85, 0.79, 0.79), borderWidth: 0.6 });
        page.drawRectangle({ x: M, y: y - rowH, width: c1, height: rowH, color: rgb(0.98, 0.98, 0.98) });
        drawText(k, M + 6, y - 13, 10, { bold: true });
        const lines = wrap(v || "-", W - 2 * M - c1 - 10, 10);
        drawText(lines[0], M + c1 + 6, y - 13, 10);
        y -= rowH;
      }
      y -= 8;
    };

    // Citizen
    section(L.citizen);
    const belongs = row.belongs_to_constituency === true ? L.yes : L.no;
    kvTable([
      [L.name, row.reporter_name || row.beneficiary_name || row.person_name || "-"],
      [L.phone, maskPhone(row.reporter_phone || row.beneficiary_phone)],
      [L.age, truthy(row.reporter_age || row.beneficiary_age) ? String(row.reporter_age || row.beneficiary_age) : "-"],
      [L.constituency, row.constituency || "-"],
      [L.belongs, belongs],
      [L.area, row.area || "-"],
      [L.city, row.city || "கோயம்புத்தூர்"],
      [L.pincode, row.pincode || "-"],
    ]);

    // Complaint
    section(L.complaint);
    kvTable([
      [L.department, row.department || row.scheme_type || "-"],
      [L.category, row.category || row.subcategory || row.incident_type || "-"],
      [L.urgency, row.urgency || "medium"],
      [L.title, row.title || row.purpose || "-"],
    ]);

    // Description
    section(L.description);
    const desc = row.description || row.purpose || "-";
    const descLines = wrap(desc, W - 2 * M - 12, 10);
    const descH = descLines.length * 13 + 10;
    page.drawRectangle({ x: M, y: y - descH, width: W - 2 * M, height: descH, color: rgb(0.98, 0.98, 0.98), borderColor: rgb(0.85, 0.79, 0.79), borderWidth: 0.6 });
    descLines.forEach((l, i) => drawText(l, M + 6, y - 13 - i * 13, 10));
    y -= (descH + 12);

    // Location
    if (y < 200) { y = 800; pdf.addPage([595, 842]); }
    section(L.location);
    kvTable([
      [L.city, row.city || "கோயம்புத்தூர்"],
      [L.area, row.area || "-"],
      [L.pincode, row.pincode || "-"],
      [L.gps, row.latitude && row.longitude ? `${row.latitude.toFixed?.(4) ?? row.latitude}, ${row.longitude.toFixed?.(4) ?? row.longitude}` : "-"],
    ]);

    // Evidence
    section(L.evidence);
    const mediaCount = Array.isArray(row.evidence_urls) ? row.evidence_urls.length
      : Array.isArray(row.proof_urls) ? row.proof_urls.length
      : Array.isArray(row.supporting_docs) ? row.supporting_docs.length
      : 0;
    drawText(mediaCount ? L.evidenceCount(mediaCount) : L.noEvidence, W / 2, y - 6, 10, { color: gray, align: "center" });
    y -= 20;

    // QR
    section(L.track);
    drawText(L.trackHelp, W / 2, y - 6, 10, { color: gray, align: "center" });
    y -= 14;
    try {
      const qrDataUrl = await makeQr(trackUrl, { size: 220 }) as string;
      const png = await pdf.embedPng(qrDataUrl);
      page.drawImage(png, { x: M, y: y - 90, width: 90, height: 90 });
      drawText(trackUrl, M + 100, y - 30, 9, { color: gray });
    } catch (qe) { console.error("qr", qe); }
    y -= 100;

    // Footer
    page.drawRectangle({ x: M, y: y - 34, width: W - 2 * M, height: 34, color: rgb(1, 0.96, 0.96), borderColor: maroon, borderWidth: 0.8 });
    drawText(L.footer1, W / 2, y - 14, 10, { bold: true, color: maroon, align: "center" });
    drawText(L.footer2, W / 2, y - 28, 9, { color: gray, align: "center" });

    const bytes = await pdf.save();
    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${ticket}-ta.pdf"`,
      },
    });
  } catch (e) {
    console.error("generate-complaint-pdf-ta", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
