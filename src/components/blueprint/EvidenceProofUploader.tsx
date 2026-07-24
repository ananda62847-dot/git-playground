import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, Loader2, X, FileText, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import AttachmentLink from '@/components/AttachmentLink';

export type EvidenceFile = {
  url: string; label: string; uploaded_by?: string | null; at: string; name?: string;
};

type Pending = {
  id: string; file: File; preview: string; progress: number;
  status: 'queued' | 'uploading' | 'scoring' | 'done' | 'error';
  error?: string;
};

interface Props {
  label: string;
  entityId: string;
  taskId: string;
  contextText?: string;
  cadreId?: string | null;
  files: EvidenceFile[];
  canEdit: boolean;
  onChange: (next: EvidenceFile[]) => Promise<void> | void;
}

const MAX_MB = 10;
const ACCEPT = 'image/*,application/pdf,video/*,audio/*';

const EvidenceProofUploader: React.FC<Props> = ({
  label, entityId, taskId, contextText, cadreId, files, canEdit, onChange,
}) => {
  const [pending, setPending] = useState<Pending[]>([]);
  const [drag, setDrag] = useState(false);
  const [scores, setScores] = useState<Record<string, any>>({});
  const [scoreSettled, setScoreSettled] = useState<Record<string, 'failed'>>({});
  const [expandedRemarks, setExpandedRemarks] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing AI scores for already-saved files, and score any missing ones.
  // Fixes "AI score pending…" getting stuck when the component re-mounts after upload.
  useEffect(() => {
    const urls = files.map(f => f.url).filter(Boolean);
    if (!urls.length) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('evidence_scores')
        .select('file_url,overall_score,relevance,clarity,authenticity,context,remarks,created_at')
        .in('file_url', urls)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      const latest: Record<string, any> = {};
      for (const row of (data as any[]) || []) {
        if (!latest[row.file_url]) latest[row.file_url] = row;
      }
      setScores(s => ({ ...latest, ...s }));

      // Trigger scoring for image files that still lack a score
      // Trigger scoring for images, PDFs, and videos that still lack a score
      const missing = files.filter(
        f => /\.(png|jpe?g|webp|gif|pdf|mp4|webm|mov|m4v)$/i.test(f.url) && !latest[f.url]
      );
      for (const f of missing) {
        try {
          const { data: res } = await supabase.functions.invoke('ai-score-evidence', {
            body: {
              file_url: f.url,
              entity_type: 'blueprint_task',
              entity_id: taskId,
              context_text: `${contextText || ''} — Evidence requirement: ${label}`,
              uploaded_by_cadre_id: cadreId,
            },
          });
          if (!cancelled && (res as any)?.score) {
            setScores(s => ({ ...s, [f.url]: (res as any).score }));
          } else if (!cancelled) {
            setScoreSettled(s => ({ ...s, [f.url]: 'failed' }));
          }
        } catch {
          if (!cancelled) setScoreSettled(s => ({ ...s, [f.url]: 'failed' }));
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.map(f => f.url).join('|')]);

  const upload = async (chosen: File[]) => {
    const queued: Pending[] = chosen.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : '',
      progress: 0,
      status: 'queued',
    }));
    setPending(p => [...p, ...queued]);

    let current = [...files];
    for (const item of queued) {
      try {
        if (item.file.size > MAX_MB * 1024 * 1024) throw new Error(`>${MAX_MB}MB`);
        setPending(p => p.map(x => x.id === item.id ? { ...x, status: 'uploading', progress: 15 } : x));
        const path = `blueprint-evidence/${entityId}/${taskId}/${Date.now()}-${item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { error: upErr } = await supabase.storage.from('problem-media').upload(path, item.file, { contentType: item.file.type, upsert: false });
        if (upErr) throw upErr;
        setPending(p => p.map(x => x.id === item.id ? { ...x, progress: 60 } : x));
        const { data: pub } = supabase.storage.from('problem-media').getPublicUrl(path);
        const { data: { user } } = await supabase.auth.getUser();
        current = [...current, { url: pub.publicUrl, label, name: item.file.name, at: new Date().toISOString(), uploaded_by: user?.id || null }];
        await onChange(current);

        // Trigger AI scoring inline (images only)
        // Trigger AI scoring inline (images, PDFs and videos)
        if (/^(image|video|application\/pdf)/i.test(item.file.type) || item.file.type === 'application/pdf') {
          setPending(p => p.map(x => x.id === item.id ? { ...x, status: 'scoring', progress: 80 } : x));
          try {
            const { data: res } = await supabase.functions.invoke('ai-score-evidence', {
              body: {
                file_url: pub.publicUrl,
                mime_type: item.file.type,
                entity_type: 'blueprint_task',
                entity_id: taskId,
                context_text: `${contextText || ''} — Evidence requirement: ${label}`,
                uploaded_by_cadre_id: cadreId,
              },
            });
            if (res?.score) setScores(s => ({ ...s, [pub.publicUrl]: res.score }));
          } catch { /* non-fatal */ }
        }

        setPending(p => p.map(x => x.id === item.id ? { ...x, status: 'done', progress: 100 } : x));
        setTimeout(() => setPending(p => p.filter(x => x.id !== item.id)), 2000);
      } catch (e: any) {
        setPending(p => p.map(x => x.id === item.id ? { ...x, status: 'error', error: e?.message || 'Failed' } : x));
        toast.error(`${item.file.name}: ${e?.message || 'Upload failed'}`);
      }
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) upload(files);
  }, [files]);

  const removeFile = async (idx: number) => {
    if (!canEdit) return;
    await onChange(files.filter((_, i) => i !== idx));
  };

  const colorFor = (s: number) => s >= 7.5 ? 'bg-emerald-600' : s >= 5 ? 'bg-amber-500' : 'bg-rose-600';

  return (
    <div className="space-y-2">
      {/* File grid with inline scores */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => {
            const isImg = /\.(png|jpe?g|webp|gif)$/i.test(f.url);
            const score = scores[f.url];
            const failed = scoreSettled[f.url] === 'failed';
            return (
              <div key={i} className="flex gap-2 p-2 rounded border bg-card">
                <AttachmentLink url={f.url} filename={f.name} className="block w-16 h-16 bg-muted rounded overflow-hidden border shrink-0 relative">
                  {isImg ? <img src={f.url} alt="" loading="lazy" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FileText className="w-5 h-5" /></div>}
                  {score && (
                    <span className={`absolute bottom-0 inset-x-0 text-[9px] font-bold text-white text-center py-0.5 ${colorFor(score.overall_score)}`}>
                      {score.overall_score.toFixed(1)}/10
                    </span>
                  )}
                </AttachmentLink>
                <div className="flex-1 min-w-0 text-[11px]">
                  <div className="font-medium truncate">{f.name || 'file'}</div>
                  {score ? (
                    <>
                      <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span>Rel {score.relevance?.toFixed(1)}</span>
                        <span>Clr {score.clarity?.toFixed(1)}</span>
                        <span>Auth {score.authenticity?.toFixed(1)}</span>
                      </div>
                      {score.remarks && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setExpandedRemarks(m => ({ ...m, [f.url]: !m[f.url] })); }}
                          className={`text-[10px] italic text-muted-foreground mt-0.5 text-left w-full hover:text-foreground transition-colors ${expandedRemarks[f.url] ? '' : 'line-clamp-2'}`}
                          title={expandedRemarks[f.url] ? 'Show less' : 'Show full explanation'}
                        >
                          <Sparkles className="w-2.5 h-2.5 inline mr-0.5" />{score.remarks}
                          {!expandedRemarks[f.url] && score.remarks.length > 80 && <span className="ml-1 text-primary">…</span>}
                        </button>
                      )}
                    </>
                  ) : /\.(pdf|mp4|webm|mov|m4v)$/i.test(f.url) && (
                    failed ? (
                      <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1 mt-1">
                        <AlertCircle className="w-2.5 h-2.5 text-amber-600" />AI score unavailable
                      </div>
                    ) : (
                      <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1 mt-1">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />AI scoring…
                      </div>
                    )
                  )}
                </div>
                {canEdit && (
                  <button type="button" onClick={() => removeFile(i)} className="text-destructive p-1 self-start" aria-label="Remove">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pending uploads */}
      {pending.map(p => (
        <div key={p.id} className="flex gap-2 p-2 rounded border bg-muted/30">
          <div className="w-16 h-16 bg-muted rounded overflow-hidden border shrink-0">
            {p.preview ? <img src={p.preview} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FileText className="w-5 h-5" /></div>}
          </div>
          <div className="flex-1 min-w-0 text-[11px]">
            <div className="font-medium truncate">{p.file.name}</div>
            <Progress value={p.progress} className="h-1.5 mt-1" />
            <div className="text-[10px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
              {p.status === 'error' ? <><AlertCircle className="w-2.5 h-2.5 text-destructive" />{p.error}</>
                : p.status === 'done' ? <><CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />Complete</>
                : p.status === 'scoring' ? <><Sparkles className="w-2.5 h-2.5 animate-pulse" />AI scoring…</>
                : <><Loader2 className="w-2.5 h-2.5 animate-spin" />{p.status}</>}
            </div>
          </div>
        </div>
      ))}

      {/* Drop zone */}
      {canEdit && (
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${drag ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
        >
          <input
            ref={inputRef} type="file" hidden multiple accept={ACCEPT}
            onChange={e => { const fs = Array.from(e.target.files || []); e.target.value = ''; if (fs.length) upload(fs); }}
          />
          <Upload className="w-4 h-4 mx-auto text-muted-foreground" />
          <div className="text-[11px] font-medium mt-1">Drop or click to upload</div>
          <div className="text-[9px] text-muted-foreground mt-0.5">
            1. Choose clear, on-site photos · 2. Multiple files supported · 3. AI scores each (0–10) with remarks · Max {MAX_MB}MB
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceProofUploader;
