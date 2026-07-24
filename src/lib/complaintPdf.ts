import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface ComplaintPdfData {
  ticket_no: string;
  submitted_at?: Date;
  status?: string;
  citizen: {
    name?: string;
    phone?: string;
    age?: string | number | null;
    constituency?: string | null;
    city?: string | null;
    area?: string | null;
    pincode?: string | null;
  };
  complaint: {
    department?: string | null;
    department_label?: string | null;
    category?: string | null;
    category_label?: string | null;
    urgency?: string | null;
    title?: string;
    description?: string;
  };
  location?: {
    latitude?: number | null;
    longitude?: number | null;
  };
  evidence_count?: number;
  has_voice_note?: boolean;
  brand?: string;       // default MAKKAL CONNECT – COIMBATORE
  subtitle?: string;    // default Digital Citizen Service & Public Grievance Platform
  trackUrl?: string;    // for QR code; default site origin + /track?t=ticket
}

const PRIMARY = '#a3174a';     // makkal-connect maroon
const LIGHT_BG = '#fff5f5';

const fmtDate = (d: Date) =>
  d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

const maskPhone = (p?: string) => {
  if (!p) return '';
  const digits = p.replace(/\D/g, '');
  if (digits.length < 6) return p;
  return `+91 ${digits.slice(0, 2)}XXX XX${digits.slice(-2)}`;
};

export async function generateComplaintPdf(data: ComplaintPdfData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  let y = 12;

  // Brand title box
  doc.setDrawColor(PRIMARY);
  doc.setLineWidth(0.6);
  doc.roundedRect(M, y, W - 2 * M, 14, 2, 2);
  doc.setTextColor(PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text((data.brand || 'MAKKAL CONNECT – COIMBATORE').toUpperCase(), W / 2, y + 9, { align: 'center' });
  y += 17;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#444');
  doc.text(data.subtitle || 'Digital Citizen Service & Public Grievance Platform', W / 2, y, { align: 'center' });
  y += 6;

  // Summary strip (3 cols)
  const stripY = y;
  const stripH = 16;
  const colW = (W - 2 * M) / 3;
  doc.setFillColor(LIGHT_BG);
  doc.rect(M, stripY, W - 2 * M, stripH, 'F');
  doc.setDrawColor('#e7c0c0');
  doc.rect(M, stripY, W - 2 * M, stripH);
  doc.line(M + colW, stripY, M + colW, stripY + stripH);
  doc.line(M + colW * 2, stripY, M + colW * 2, stripY + stripH);
  const labelRow = (label: string, value: string, idx: number, color = '#a3174a') => {
    const x = M + idx * colW + colW / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor('#7a1f1f');
    doc.text(label, x, stripY + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(color);
    doc.text(value, x, stripY + 12, { align: 'center' });
  };
  labelRow('Complaint ID', data.ticket_no, 0);
  labelRow('Submitted On', fmtDate(data.submitted_at || new Date()), 1, '#222');
  labelRow('Status', `${data.status || 'Submitted'} ✓`, 2, '#137333');
  y = stripY + stripH + 6;

  // Section helper
  const sectionTitle = (t: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(PRIMARY);
    doc.text(t, M, y);
    y += 5;
  };

  const drawTable = (rows: [string, string][], col1W = 45) => {
    doc.setFontSize(10);
    doc.setTextColor('#222');
    rows.forEach(([k, v]) => {
      const rowH = 7;
      doc.setDrawColor('#d9c9c9');
      doc.rect(M, y, W - 2 * M, rowH);
      doc.line(M + col1W, y, M + col1W, y + rowH);
      doc.setFillColor('#fafafa');
      doc.rect(M, y, col1W, rowH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text(k, M + 2, y + 4.8);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(v || '-', W - 2 * M - col1W - 4);
      doc.text(lines.slice(0, 1), M + col1W + 2, y + 4.8);
      y += rowH;
    });
    y += 4;
  };

  // Citizen Information
  sectionTitle('Citizen Information');
  drawTable([
    ['Full Name', data.citizen.name || '-'],
    ['Phone Number', maskPhone(data.citizen.phone) || '-'],
    ['Age', data.citizen.age ? String(data.citizen.age) : '-'],
    ['Constituency', data.citizen.constituency || '-'],
    ['Area', data.citizen.area || '-'],
    ['District', data.citizen.city || 'Coimbatore'],
    ['Pincode', data.citizen.pincode || '-'],
  ]);

  // Complaint Details
  sectionTitle('Complaint Details');
  drawTable([
    ['Problem Department', data.complaint.department_label || data.complaint.department || '-'],
    ['Urgency', (data.complaint.urgency || 'Medium').toString().replace(/^./, c => c.toUpperCase())],
    ['Category', data.complaint.category_label || data.complaint.category || '-'],
    ['Title', data.complaint.title || '-'],
  ]);

  // Problem Description (wrapped box)
  sectionTitle('Problem Description');
  doc.setFontSize(10);
  doc.setTextColor('#222');
  const descLines = doc.splitTextToSize(data.complaint.description || '-', W - 2 * M - 6);
  const descH = Math.max(14, descLines.length * 4.6 + 6);
  doc.setDrawColor('#d9c9c9');
  doc.setFillColor('#fafafa');
  doc.roundedRect(M, y, W - 2 * M, descH, 1.5, 1.5, 'FD');
  doc.text(descLines, M + 3, y + 5);
  y += descH + 4;

  // Location
  sectionTitle('Location Details');
  drawTable([
    ['District', data.citizen.city || 'Coimbatore'],
    ['Area', data.citizen.area || '-'],
    ['Pincode', data.citizen.pincode || '-'],
    ['GPS Coordinates',
      data.location?.latitude && data.location?.longitude
        ? `${data.location.latitude.toFixed(4)}, ${data.location.longitude.toFixed(4)}`
        : '-'],
  ]);

  // Evidence
  sectionTitle('Evidence / Media Uploads');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#444');
  const evidenceText = [
    data.evidence_count ? `Citizen uploaded ${data.evidence_count} supporting file(s) for verification.` : 'No media uploaded.',
    data.has_voice_note ? 'A voice note was attached.' : '',
  ].filter(Boolean).join(' ');
  doc.text(evidenceText, W / 2, y + 4, { align: 'center' });
  y += 10;

  // QR Track section
  sectionTitle('Track Complaint');
  doc.setFontSize(10);
  doc.setTextColor('#444');
  doc.text('Scan QR or use Complaint ID to track complaint status.', W / 2, y + 4, { align: 'center' });
  y += 8;
  const qrUrl = data.trackUrl || (typeof window !== 'undefined'
    ? `${window.location.origin}/track?t=${encodeURIComponent(data.ticket_no)}`
    : `https://makkal-connect/track?t=${encodeURIComponent(data.ticket_no)}`);
  try {
    const dataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 220 });
    doc.addImage(dataUrl, 'PNG', M, y, 32, 32);
  } catch {}
  y += 36;

  // Footer
  doc.setDrawColor(PRIMARY);
  doc.setFillColor(LIGHT_BG);
  doc.roundedRect(M, y, W - 2 * M, 14, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(PRIMARY);
  doc.text('This document confirms successful complaint registration.', W / 2, y + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Makkal Connect – Strengthening Citizen Service & Public Resolution', W / 2, y + 11, { align: 'center' });

  return doc;
}

export async function downloadComplaintPdf(data: ComplaintPdfData) {
  const doc = await generateComplaintPdf(data);
  doc.save(`${data.ticket_no}.pdf`);
}
