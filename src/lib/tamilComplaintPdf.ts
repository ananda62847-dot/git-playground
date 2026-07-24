import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

export type ReportKind = 'problem' | 'welfare' | 'fund' | 'corruption';

/**
 * Client-side Tamil complaint PDF generator.
 *
 * We render an HTML template into an off-screen node with the Noto Sans Tamil
 * webfont, snapshot it with html2canvas (the browser handles all Tamil
 * shaping / reordering / ligatures perfectly), then place the raster on an A4
 * jsPDF page. This produces pixel-perfect Tamil output, unlike server-side
 * pdf-lib which cannot fully shape Indic scripts.
 */

const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&display=swap';

let fontEnsured = false;
async function ensureFont() {
  if (fontEnsured) return;
  if (!document.querySelector(`link[href="${FONT_CSS_URL}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_CSS_URL;
    document.head.appendChild(link);
  }
  // Force font to actually download before snapshot.
  try {
    await (document as any).fonts?.load('700 20px "Noto Sans Tamil"');
    await (document as any).fonts?.load('400 14px "Noto Sans Tamil"');
    await (document as any).fonts?.ready;
  } catch {}
  fontEnsured = true;
}

const tableFor = (kind: ReportKind) =>
  kind === 'welfare' ? 'welfare_issues'
    : kind === 'fund' ? 'fund_assistance_requests'
    : kind === 'corruption' ? 'corruption_reports'
    : 'problems';

function maskPhone(p?: string | null) {
  if (!p) return '-';
  const d = String(p).replace(/\D/g, '');
  if (d.length < 6) return String(p);
  return `+91 ${d.slice(0, 2)}XXX XX${d.slice(-2)}`;
}

function esc(s: unknown) {
  const str = s === null || s === undefined || String(s).trim() === '' ? '-' : String(s);
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildHtml(row: any, kind: ReportKind, qrDataUrl: string, trackUrl: string) {
  const ticket = row.ticket_no || row.id;
  const submitted = row.created_at
    ? new Date(row.created_at).toLocaleString('ta-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '-';
  const name = row.reporter_name || row.beneficiary_name || row.person_name || '-';
  const phone = row.reporter_phone || row.beneficiary_phone;
  const age = row.reporter_age || row.beneficiary_age;
  const belongs = row.belongs_to_constituency === true ? 'ஆம்' : 'இல்லை';
  const dept = row.department || row.scheme_type || row.incident_type || '-';
  const cat = row.category || row.subcategory || '-';
  const urgency = row.urgency || row.severity || 'நடுத்தரம்';
  const title = row.title || row.purpose || row.scheme_name || '-';
  const desc = row.description || row.details || row.purpose || '-';
  const mediaCount =
    (Array.isArray(row.evidence_urls) && row.evidence_urls.length) ||
    (Array.isArray(row.proof_urls) && row.proof_urls.length) ||
    (Array.isArray(row.supporting_docs) && row.supporting_docs.length) ||
    (Array.isArray(row.attachments) && row.attachments.length) ||
    0;
  const hasVoice = !!(row.voice_note_url || row.voice_url);

  const kvRow = (k: string, v: string) => `
    <tr>
      <td class="k">${k}</td>
      <td class="v">${v}</td>
    </tr>`;

  return `
  <div id="ta-pdf-root" style="
    width:794px; padding:32px 36px; background:#ffffff; color:#1a1a1a;
    font-family:'Noto Sans Tamil','Latha','Nirmala UI',sans-serif;
    font-size:13px; line-height:1.55; box-sizing:border-box;">
    <style>
      #ta-pdf-root h1{font-size:22px; margin:0; color:#a3174a; text-align:center; font-weight:700;}
      #ta-pdf-root .sub{font-size:12px; color:#555; text-align:center; margin-top:4px;}
      #ta-pdf-root .brand-box{border:1.4px solid #a3174a; border-radius:6px; padding:10px 12px;}
      #ta-pdf-root .strip{display:grid; grid-template-columns:1fr 1fr 1fr; margin-top:14px;
        background:#fff5f5; border:1px solid #e7c0c0; border-radius:4px;}
      #ta-pdf-root .strip > div{padding:8px 6px; text-align:center; border-right:1px solid #e7c0c0;}
      #ta-pdf-root .strip > div:last-child{border-right:none;}
      #ta-pdf-root .strip .lbl{font-size:11px; color:#7a1f1f; font-weight:700;}
      #ta-pdf-root .strip .val{font-size:13px; color:#222; margin-top:2px;}
      #ta-pdf-root h2{font-size:14px; margin:18px 0 6px; color:#a3174a; font-weight:700;}
      #ta-pdf-root table{width:100%; border-collapse:collapse; table-layout:fixed;}
      #ta-pdf-root td{border:0.7px solid #d9c9c9; padding:6px 8px; vertical-align:top; font-size:12.5px;}
      #ta-pdf-root td.k{width:38%; background:#fafafa; font-weight:700;}
      #ta-pdf-root .desc{border:0.7px solid #d9c9c9; background:#fafafa; padding:10px; border-radius:3px; white-space:pre-wrap;}
      #ta-pdf-root .evidence{text-align:center; color:#444; margin:6px 0;}
      #ta-pdf-root .qr-row{display:flex; align-items:center; gap:14px; margin-top:6px;}
      #ta-pdf-root .qr-row img{width:110px; height:110px;}
      #ta-pdf-root .qr-row .u{font-size:11px; color:#555; word-break:break-all;}
      #ta-pdf-root .footer{margin-top:18px; border:1px solid #a3174a; background:#fff5f5;
        border-radius:4px; padding:10px; text-align:center;}
      #ta-pdf-root .footer .l1{color:#a3174a; font-weight:700; font-size:12.5px;}
      #ta-pdf-root .footer .l2{color:#555; font-size:11px; margin-top:3px;}
    </style>

    <div class="brand-box">
      <h1>மக்கள் கனெக்ட் – கோயம்புத்தூர்</h1>
      <div class="sub">மின்னணு குடிமக்கள் சேவை மற்றும் பொது குறைதீர்வு தளம்</div>
    </div>

    <div class="strip">
      <div><div class="lbl">புகார் எண்</div><div class="val">${esc(ticket)}</div></div>
      <div><div class="lbl">சமர்ப்பித்த நேரம்</div><div class="val">${esc(submitted)}</div></div>
      <div><div class="lbl">நிலை</div><div class="val" style="color:#137333;">${esc(row.status || 'சமர்ப்பிக்கப்பட்டது')} ✓</div></div>
    </div>

    <h2>குடிமகன் தகவல்</h2>
    <table>
      ${kvRow('பெயர்', esc(name))}
      ${kvRow('தொலைபேசி', esc(maskPhone(phone)))}
      ${kvRow('வயது', esc(age))}
      ${kvRow('தொகுதி', esc(row.constituency))}
      ${kvRow('தொகுதியைச் சேர்ந்தவரா', belongs)}
      ${kvRow('பகுதி', esc(row.area))}
      ${kvRow('மாவட்டம்', esc(row.city || 'கோயம்புத்தூர்'))}
      ${kvRow('அஞ்சல் குறியீடு', esc(row.pincode))}
    </table>

    <h2>புகார் விவரங்கள்</h2>
    <table>
      ${kvRow('துறை', esc(dept))}
      ${kvRow('வகை', esc(cat))}
      ${kvRow('அவசர நிலை', esc(urgency))}
      ${kvRow('தலைப்பு', esc(title))}
    </table>

    <h2>விவரமான விளக்கம்</h2>
    <div class="desc">${esc(desc)}</div>

    <h2>இடம் விவரம்</h2>
    <table>
      ${kvRow('மாவட்டம்', esc(row.city || 'கோயம்புத்தூர்'))}
      ${kvRow('பகுதி', esc(row.area))}
      ${kvRow('அஞ்சல் குறியீடு', esc(row.pincode))}
      ${kvRow('அட்சரேகை / தீர்க்கரேகை',
        row.latitude && row.longitude
          ? `${Number(row.latitude).toFixed(4)}, ${Number(row.longitude).toFixed(4)}`
          : '-')}
    </table>

    <h2>இணைக்கப்பட்ட ஆதாரங்கள்</h2>
    <div class="evidence">
      ${mediaCount ? `${mediaCount} கோப்பு(கள்) இணைக்கப்பட்டுள்ளன.` : 'எந்த ஆதாரமும் இணைக்கப்படவில்லை.'}
      ${hasVoice ? ' ஒரு குரல் குறிப்பு இணைக்கப்பட்டுள்ளது.' : ''}
    </div>

    <h2>புகாரின் நிலையை கண்காணிக்க</h2>
    <div class="qr-row">
      <img src="${qrDataUrl}" alt="QR" />
      <div>
        <div>கீழுள்ள QR குறியீட்டை ஸ்கேன் செய்யுங்கள் அல்லது புகார் எண்ணைப் பயன்படுத்துங்கள்.</div>
        <div class="u">${esc(trackUrl)}</div>
      </div>
    </div>

    <div class="footer">
      <div class="l1">இந்த ஆவணம் உங்கள் புகார் வெற்றிகரமாக பதிவு செய்யப்பட்டதை உறுதிப்படுத்துகிறது.</div>
      <div class="l2">மக்கள் கனெக்ட் – குடிமக்கள் சேவை மற்றும் பொது தீர்வு</div>
    </div>
  </div>`;
}

export async function downloadTamilComplaintPdf(kind: ReportKind, reportId: string, ticketNo?: string) {
  const t = toast.loading('தமிழ் PDF தயாராகிறது…');
  let host: HTMLDivElement | null = null;
  try {
    await ensureFont();

    const { data: row, error } = await supabase
      .from(tableFor(kind))
      .select('*')
      .eq('id', reportId)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error('Report not found');

    const ticket = (row as any).ticket_no || ticketNo || reportId;
    const trackUrl = `https://makkal-connect.tvk.upcurv.in/#track?ticket=${encodeURIComponent(ticket)}&auto=1`;
    const qrDataUrl = await QRCode.toDataURL(trackUrl, { margin: 1, width: 220 });

    // Off-screen render (must be in the document, not display:none, or html2canvas
    // will not measure text width — position it far off-screen instead).
    host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-10000px';
    host.style.top = '0';
    host.style.background = '#ffffff';
    host.innerHTML = buildHtml(row, kind, qrDataUrl, trackUrl);
    document.body.appendChild(host);

    // Small delay to let webfont render.
    await new Promise((r) => setTimeout(r, 120));

    const node = host.querySelector('#ta-pdf-root') as HTMLElement;
    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    if (imgH <= pageH) {
      pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
    } else {
      // Slice across multiple pages.
      let remaining = imgH;
      let offset = 0;
      while (remaining > 0) {
        pdf.addImage(imgData, 'JPEG', 0, -offset, imgW, imgH);
        remaining -= pageH;
        offset += pageH;
        if (remaining > 0) pdf.addPage();
      }
    }

    pdf.save(`${ticket}-ta.pdf`);
    toast.success('தமிழ் PDF பதிவிறக்கம் ஆனது', { id: t });
  } catch (e: any) {
    console.error('downloadTamilComplaintPdf', e);
    toast.error(`Failed: ${e?.message || e}`, { id: t });
  } finally {
    if (host && host.parentNode) host.parentNode.removeChild(host);
  }
}
