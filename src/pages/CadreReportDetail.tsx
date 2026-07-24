import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Phone, Clock, AlertTriangle, ShieldAlert, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { DEPARTMENTS, STATUS_STAGES } from '@/lib/departments';
import { fmtIST } from '@/lib/datetime';
import BlueprintProgressStrip from '@/components/blueprint/BlueprintProgressStrip';
import ResolutionBlueprintPanel from '@/components/blueprint/ResolutionBlueprintPanel';
import EvidenceTile from '@/components/admin/EvidenceTile';
import MediaPreviewModal from '@/components/MediaPreviewModal';
import { exportReportCsv, exportReportPdf } from '@/lib/reportExport';
import { toast } from 'sonner';
import { useT, useLang, depLabel, stageLabel } from '@/lib/i18n/cadreT';
import CadreFiledBadge from '@/components/CadreFiledBadge';
import { UserCheck } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';

const CadreReportDetail: React.FC = () => {
  const T = useT();
  const lang = useLang();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const initial = location.state?.problem || null;
  const [problem, setProblem] = useState<any>(initial);
  const [media, setMedia] = useState<any[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [cadreId, setCadreId] = useState<string | null>(null);
  const [filedByCadre, setFiledByCadre] = useState<{ name: string; phone?: string; level?: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    // Critical: problem first (fast paint)
    (async () => {
      if (!initial) {
        const { data: p } = await supabase.from('problems').select('*').eq('id', id).maybeSingle();
        if (p) setProblem(p);
      }
    })();
    // Deferred: media + auth
    (async () => {
      const { data: m } = await supabase.from('problem_media').select('*').eq('problem_id', id);
      setMedia(m || []);
      setMediaLoading(false);
    })();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: c } = await supabase.from('cadres').select('id').eq('user_id', user.id).maybeSingle();
        setCadreId(c?.id || null);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (problem?.is_cadre_filed && problem?.reported_by_cadre_id) {
      supabase.from('cadres').select('name,phone,level').eq('id', problem.reported_by_cadre_id).maybeSingle()
        .then(({ data }) => { if (data) setFiledByCadre(data as any); });
    }
  }, [problem?.reported_by_cadre_id, problem?.is_cadre_filed]);

  if (!problem) {
    return (
      <div className="min-h-screen bg-background p-3 space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const dep = DEPARTMENTS.find(d => d.id === problem.department);
  const stage = STATUS_STAGES.find(s => s.id === problem.status);
  const ageH = (Date.now() - new Date(problem.created_at).getTime()) / 3600000;
  const target = problem.urgency === 'emergency' ? 12 : problem.urgency === 'high' ? 48 : 168;
  const remH = target - ageH;

  const doExport = async (kind: 'pdf' | 'csv') => {
    const urls = media.map(m => m.url);
    const scoresByUrl: Record<string, any> = {};
    if (urls.length) {
      const { data: scores } = await supabase.from('evidence_scores')
        .select('file_url,overall_score,relevance,clarity,authenticity,remarks,context,created_at')
        .in('file_url', urls)
        .order('created_at', { ascending: false });
      (scores || []).forEach((s: any) => { if (!scoresByUrl[s.file_url]) scoresByUrl[s.file_url] = s; });
    }
    const { data: tasks } = await supabase.from('blueprint_tasks')
      .select('title,status,owner_label:owner_cadre_id,due_at,seq')
      .eq('problem_id', problem.id).order('seq');
    try {
      if (kind === 'csv') exportReportCsv({ problem, media, scoresByUrl, tasks: tasks || [] });
      else await exportReportPdf({ problem, media, scoresByUrl, tasks: tasks || [] });
      toast.success(`${kind.toUpperCase()} ready`);
    } catch (e: any) {
      toast.error(e?.message || 'Export failed');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Sticky app bar */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft className="w-5 h-5" /></Button>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] text-muted-foreground truncate">{problem.ticket_no}</div>
            <div className="text-sm font-semibold truncate">{problem.title}</div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Export"><Download className="w-5 h-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => doExport('pdf')}><FileText className="w-4 h-4 mr-2" />Export PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => doExport('csv')}><FileSpreadsheet className="w-4 h-4 mr-2" />Export CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Section chip nav (mobile-friendly) */}
        <nav className="flex gap-1.5 overflow-x-auto px-2 pb-2 text-[11px]">
          {[
            { id: 'report', l: T.section_report }, { id: 'citizen', l: T.section_citizen }, { id: 'location', l: T.section_location },
            { id: 'evidence', l: `${T.section_evidence} (${media.length})` }, { id: 'plan', l: T.section_plan },
          ].map(s => (
            <a key={s.id} href={`#sec-${s.id}`} className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 shrink-0">{s.l}</a>
          ))}
        </nav>
      </header>

      <main className="px-3 py-3 space-y-3">
        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px]">{dep?.icon} {depLabel(dep, lang)}</Badge>
          <Badge variant="outline" className={`text-[10px] ${stage?.color}`}>{stageLabel(stage, lang)}</Badge>
          {problem.urgency === 'emergency' && <Badge className="bg-red-600 text-white text-[10px]">{T.emergency.toUpperCase()}</Badge>}
          {problem.urgency === 'high' && <Badge className="bg-orange-500 text-white text-[10px]">{T.high.toUpperCase()}</Badge>}
          {problem.is_cadre_filed && <CadreFiledBadge cadreName={filedByCadre?.name} />}
          {remH < 0
            ? <Badge className="bg-red-100 text-red-700 text-[10px]"><AlertTriangle className="w-3 h-3 mr-0.5" />{T.sla_breached}</Badge>
            : <Badge variant="outline" className="text-[10px]"><Clock className="w-3 h-3 mr-0.5" />{T.sla_left(Math.round(remH))}</Badge>}
        </div>

        <BlueprintProgressStrip kind="problem" entityId={problem.id} />

        <Section id="report" title={T.section_report}>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{problem.description}</p>
        </Section>

        <Section id="citizen" title={T.section_citizen}>
          <div className="text-sm">{problem.reporter_name}{problem.reporter_age ? ` · ${problem.reporter_age} yrs` : ''}</div>
          <a href={`tel:${problem.reporter_phone}`} className="inline-flex items-center gap-1 text-primary text-sm"><Phone className="w-3 h-3" />{problem.reporter_phone}</a>
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><Clock className="w-3 h-3" />{fmtIST(problem.created_at)}</div>
          {problem.is_cadre_filed && (
            <div className="mt-2 pt-2 border-t border-dashed text-xs inline-flex items-center gap-1.5 text-amber-800">
              <UserCheck className="w-3.5 h-3.5" />
              <span className="font-semibold">{T.filed_by_cadre_label}:</span>
              <span>{filedByCadre ? `${filedByCadre.name}${filedByCadre.level ? ` · ${filedByCadre.level}` : ''}` : '—'}</span>
            </div>
          )}
        </Section>

        <Section id="location" title={T.section_location}>
          <div className="flex items-start gap-1.5 text-sm"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{[problem.address_line, problem.area, problem.constituency, problem.city, problem.pincode].filter(Boolean).join(' · ')}</span>
          </div>
          {problem.latitude && (
            <a href={`https://maps.google.com/?q=${problem.latitude},${problem.longitude}`} target="_blank" rel="noreferrer"
              className="text-xs text-primary underline mt-1 inline-block">{T.open_maps}</a>
          )}
        </Section>

        {mediaLoading && (
          <Section id="evidence" title={T.citizen_evidence}>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" />
            </div>
          </Section>
        )}
        {!mediaLoading && media.length > 0 && (
          <Section id="evidence" title={`${T.citizen_evidence} (${media.length})`}>
            <div className="grid grid-cols-2 gap-2">
              {media.map(m => (
                <EvidenceTile
                  key={m.id}
                  url={m.url}
                  entityType="problem"
                  entityId={problem.id}
                  contextText={`${problem.title} — ${problem.description?.slice(0, 200)}`}
                  cadreId={cadreId}
                  imgClassName="w-full h-32 object-cover"
                  onOpen={() => setPreview(m.url)}
                />
              ))}
            </div>
          </Section>
        )}

        <Section id="plan" title={T.action_plan_title} defaultOpen>
          <ResolutionBlueprintPanel kind="problem" entity={problem} isAdmin={false} />
        </Section>
      </main>


      {/* Bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t z-30 px-3 py-2 flex gap-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}>
        <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>{T.close}</Button>
        <Button className="flex-1" onClick={() => navigate(`/cadre?tab=tasks&open=${problem.id}`)}>
          <ShieldAlert className="w-4 h-4 mr-1" />{T.open_workspace}
        </Button>
      </div>

      {preview && <MediaPreviewModal url={preview} onClose={() => setPreview(null)} />}
    </div>
  );
};

const Section: React.FC<{ id: string; title: string; defaultOpen?: boolean; children: React.ReactNode }> = ({ id, title, defaultOpen = true, children }) => (
  <section id={`sec-${id}`} className="bg-card border rounded-lg scroll-mt-28">
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between p-3 group">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">{title}</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 space-y-1.5">{children}</CollapsibleContent>
    </Collapsible>
  </section>
);

export default CadreReportDetail;

