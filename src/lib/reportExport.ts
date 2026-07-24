// One-click CSV + PDF exporter for a single cadre/admin report page.
// Embeds AI evidence scores (latest /10) alongside each file.
import jsPDF from 'jspdf';

type Score = {
  file_url: string;
  overall_score?: number;
  relevance?: number;
  clarity?: number;
  authenticity?: number;
  remarks?: string;
  context?: string;
  created_at?: string;
};

const csvCell = (v: any) => `"${String(v ?? '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
const download = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function exportReportCsv(opts: {
  problem: any; media: any[]; scoresByUrl: Record<string, Score | undefined>; tasks?: any[];
}) {
  const { problem: p, media, scoresByUrl, tasks = [] } = opts;
  const rows: string[][] = [];
  rows.push(['Field', 'Value']);
  rows.push(['Ticket', p.ticket_no]);
  rows.push(['Title', p.title]);
  rows.push(['Status', p.status]);
  rows.push(['Urgency', p.urgency || '']);
  rows.push(['Department', p.department || '']);
  rows.push(['Created', p.created_at || '']);
  rows.push(['Resolved', p.resolved_at || '']);
  rows.push(['Citizen', `${p.reporter_name || ''} (${p.reporter_phone || ''})`]);
  rows.push(['Location', [p.address_line, p.area, p.constituency, p.city, p.pincode].filter(Boolean).join(' · ')]);
  rows.push(['Description', p.description || '']);
  rows.push([]);
  rows.push(['Evidence', 'URL', 'AI Score /10', 'Relevance', 'Clarity', 'Authenticity', 'Remarks']);
  media.forEach((m, i) => {
    const s = scoresByUrl[m.url];
    rows.push([
      `Item ${i + 1}`, m.url,
      s?.overall_score != null ? Number(s.overall_score).toFixed(1) : '—',
      s?.relevance != null ? Number(s.relevance).toFixed(1) : '—',
      s?.clarity != null ? Number(s.clarity).toFixed(1) : '—',
      s?.authenticity != null ? Number(s.authenticity).toFixed(1) : '—',
      s?.remarks || '',
    ]);
  });
  if (tasks.length) {
    rows.push([]);
    rows.push(['Checklist', 'Title', 'Status', 'Owner', 'Due']);
    tasks.forEach((t, i) => rows.push([
      `Task ${i + 1}`, t.title || '', t.status || '', t.owner_label || '', t.due_at || '',
    ]));
  }
  const csv = rows.map(r => r.map(csvCell).join(',')).join('\n');
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${p.ticket_no || 'report'}.csv`);
}

const fetchAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
};

const colorForScore = (s?: number): [number, number, number] => {
  if (s == null) return [120, 120, 120];
  if (s >= 7.5) return [16, 150, 90];
  if (s >= 5) return [217, 140, 30];
  return [200, 50, 60];
};

export async function exportReportPdf(opts: {
  problem: any; media: any[]; scoresByUrl: Record<string, Score | undefined>; tasks?: any[];
}) {
  const { problem: p, media, scoresByUrl, tasks = [] } = opts;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  let y = 14;

  const ensure = (need: number) => {
    if (y + need > H - 12) { doc.addPage(); y = 14; }
  };

  // Title
  doc.setFillColor(163, 23, 74);
  doc.rect(M, y, W - 2 * M, 12, 'F');
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text(`REPORT · ${p.ticket_no || ''}`, M + 4, y + 8);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleString('en-IN'), W - M - 4, y + 8, { align: 'right' });
  y += 16;

  // Title row
  doc.setTextColor(20); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  const titleLines = doc.splitTextToSize(p.title || '', W - 2 * M);
  doc.text(titleLines, M, y); y += titleLines.length * 5 + 2;

  // Status pills
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80);
  const pills = [p.status, p.urgency && `urgency: ${p.urgency}`, p.department].filter(Boolean).join('   ·   ');
  doc.text(pills, M, y); y += 6;

  // Two-column meta
  const writeKV = (label: string, val: string, col: number) => {
    const cw = (W - 2 * M) / 2 - 2;
    const x = M + col * (cw + 4);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(80); doc.text(label, x, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(20);
    const lines = doc.splitTextToSize(val || '—', cw);
    doc.text(lines, x, y + 4);
    return lines.length;
  };
  ensure(20);
  const ll = writeKV('Citizen', `${p.reporter_name || '—'} · ${p.reporter_phone || ''}`, 0);
  const rl = writeKV('Created', new Date(p.created_at).toLocaleString('en-IN'), 1);
  y += Math.max(ll, rl) * 4 + 6;
  ensure(20);
  const ll2 = writeKV('Location', [p.address_line, p.area, p.constituency, p.city, p.pincode].filter(Boolean).join(' · '), 0);
  const rl2 = writeKV('Resolved', p.resolved_at ? new Date(p.resolved_at).toLocaleString('en-IN') : '—', 1);
  y += Math.max(ll2, rl2) * 4 + 6;

  // Description
  ensure(20);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(80); doc.text('Description', M, y); y += 4;
  doc.setFont('helvetica', 'normal'); doc.setTextColor(20);
  const descLines = doc.splitTextToSize(p.description || '', W - 2 * M);
  ensure(descLines.length * 4 + 4);
  doc.text(descLines, M, y); y += descLines.length * 4 + 6;

  // Evidence with thumbnails + AI score
  if (media.length) {
    ensure(8);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(80); doc.setFontSize(10);
    doc.text(`Evidence (${media.length})`, M, y); y += 5;
    const cellW = (W - 2 * M - 4) / 2;
    const imgH = 38;
    let col = 0;
    for (const m of media) {
      if (col === 0) ensure(imgH + 16);
      const x = M + col * (cellW + 4);
      const dataUrl = await fetchAsDataUrl(m.url);
      if (dataUrl) {
        try { doc.addImage(dataUrl, 'JPEG', x, y, cellW, imgH); } catch { /* ignore */ }
      } else {
        doc.setDrawColor(200); doc.rect(x, y, cellW, imgH);
        doc.setFontSize(8); doc.setTextColor(150);
        doc.text('image unavailable', x + cellW / 2, y + imgH / 2, { align: 'center' });
      }
      const s = scoresByUrl[m.url];
      const score = s?.overall_score != null ? Number(s.overall_score) : undefined;
      const [r, g, b] = colorForScore(score);
      doc.setFillColor(r, g, b);
      doc.roundedRect(x + cellW - 16, y + 1, 15, 6, 1.5, 1.5, 'F');
      doc.setTextColor(255); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text(score != null ? `${score.toFixed(1)}/10` : '—', x + cellW - 8.5, y + 5.2, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setTextColor(60); doc.setFontSize(8);
      const remark = (s?.remarks || s?.context || '').slice(0, 140);
      const rLines = doc.splitTextToSize(remark, cellW);
      doc.text(rLines.slice(0, 2), x, y + imgH + 3);
      col++;
      if (col === 2) { col = 0; y += imgH + 12; }
    }
    if (col !== 0) y += imgH + 12;
  }

  // Checklist
  if (tasks.length) {
    ensure(10);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(80); doc.setFontSize(10);
    doc.text('Action Plan & Checklist', M, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    tasks.forEach((t) => {
      ensure(6);
      const mark = (t.status === 'done' || t.status === 'skipped') ? '[x]' : '[ ]';
      const line = doc.splitTextToSize(`${mark} ${t.title || ''}  —  ${t.status || ''}`, W - 2 * M);
      doc.setTextColor(t.status === 'done' ? 30 : 60);
      doc.text(line, M, y); y += line.length * 4 + 1;
    });
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(140);
    doc.text(`Makkal Connect · ${p.ticket_no || ''} · Page ${i}/${pages}`, W / 2, H - 6, { align: 'center' });
  }

  doc.save(`${p.ticket_no || 'report'}.pdf`);
}
