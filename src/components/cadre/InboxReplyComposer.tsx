import React, { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, Paperclip, Upload, X, FileText, Loader2, Send, RefreshCw,
  CheckCircle2, AlertCircle, Image as ImageIcon, Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type ReplyAttachment = {
  url: string;
  name: string;
  mime: string;
  summary?: string;
  key_points?: string[];
  suggested_action?: string;
  confidence?: number;
};

type Pending = {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'uploading' | 'summarizing' | 'done' | 'error';
  error?: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  cadreId: string;
  taskTitle?: string;
  onSend: (reply: string, attachments: ReplyAttachment[], usedAiDraft: boolean) => Promise<void>;
}

const MAX_FILES = 5;
const MAX_MB = 10;
const ACCEPT = 'image/*,application/pdf,audio/*';
const ALLOWED = /^(image\/(png|jpe?g|webp|gif)|application\/pdf|audio\/.+)$/;

const InboxReplyComposer: React.FC<Props> = ({
  open, onOpenChange, taskId, cadreId, taskTitle, onSend,
}) => {
  const [reply, setReply] = useState('');
  const [attachments, setAttachments] = useState<ReplyAttachment[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [drag, setDrag] = useState(false);
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [drafts, setDrafts] = useState<{ acknowledge: string; action_plan: string; need_info: string } | null>(null);
  const [usedAiDraft, setUsedAiDraft] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setReply(''); setAttachments([]); setPending([]); setDrafts(null); setUsedAiDraft(false);
  };

  const upload = async (chosen: File[]) => {
    if (attachments.length + pending.length + chosen.length > MAX_FILES) {
      toast.error(`Max ${MAX_FILES} attachments`); return;
    }
    const queued: Pending[] = chosen
      .filter(f => {
        if (f.size > MAX_MB * 1024 * 1024) { toast.error(`${f.name}: > ${MAX_MB}MB`); return false; }
        if (!ALLOWED.test(f.type)) { toast.error(`${f.name}: unsupported type`); return false; }
        return true;
      })
      .map(f => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : '',
        progress: 0,
        status: 'uploading' as const,
      }));
    if (!queued.length) return;
    setPending(p => [...p, ...queued]);

    for (const item of queued) {
      try {
        setPending(p => p.map(x => x.id === item.id ? { ...x, progress: 20 } : x));
        const safe = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `inbox-attachments/${cadreId}/${taskId}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage.from('problem-media')
          .upload(path, item.file, { contentType: item.file.type, upsert: false });
        if (upErr) throw upErr;
        setPending(p => p.map(x => x.id === item.id ? { ...x, progress: 55 } : x));
        const { data: pub } = supabase.storage.from('problem-media').getPublicUrl(path);

        // try AI summary (non-fatal)
        setPending(p => p.map(x => x.id === item.id ? { ...x, status: 'summarizing', progress: 70 } : x));
        let summary: any = {};
        try {
          const cacheKey = `inbox-att:${pub.publicUrl}`;
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) summary = JSON.parse(cached);
          else {
            const { data } = await supabase.functions.invoke('ai-summarize-attachment', {
              body: { file_url: pub.publicUrl, mime: item.file.type, context: taskTitle || '' },
            });
            summary = data || {};
            try { sessionStorage.setItem(cacheKey, JSON.stringify(summary)); } catch { /* */ }
          }
        } catch { /* non-fatal */ }

        const att: ReplyAttachment = {
          url: pub.publicUrl, name: item.file.name, mime: item.file.type,
          summary: summary?.summary, key_points: summary?.key_points,
          suggested_action: summary?.suggested_action, confidence: summary?.confidence,
        };
        setAttachments(a => [...a, att]);
        setPending(p => p.map(x => x.id === item.id ? { ...x, status: 'done', progress: 100 } : x));
        setTimeout(() => setPending(p => p.filter(x => x.id !== item.id)), 1500);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments, pending]);

  const generateDrafts = async () => {
    setDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-draft-inbox-reply', {
        body: {
          task_id: taskId,
          attachment_summaries: attachments.map(a => ({
            name: a.name, summary: a.summary, key_points: a.key_points,
          })),
        },
      });
      if (error) throw error;
      setDrafts(data);
    } catch (e: any) {
      toast.error(e?.message || 'Could not generate drafts');
    } finally {
      setDrafting(false);
    }
  };

  const pickDraft = (text: string) => {
    setReply(text); setUsedAiDraft(true);
  };

  const send = async () => {
    if (!reply.trim()) { toast.error('Add a reply message'); return; }
    setSending(true);
    try {
      await onSend(reply.trim(), attachments, usedAiDraft);
      reset();
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  const useSuggested = () => {
    const tips = attachments.flatMap(a => a.suggested_action ? [a.suggested_action] : []).join(' ');
    if (tips) setReply(r => (r ? r + '\n' : '') + tips);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4" />Reply with attachments
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* AI drafts */}
          <div className="rounded-lg border bg-violet-50/40 p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-violet-800">
                <Sparkles className="w-3.5 h-3.5" />AI drafted replies
              </div>
              <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={generateDrafts} disabled={drafting}>
                {drafting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Wand2 className="w-3 h-3 mr-1" />}
                {drafts ? 'Regenerate' : 'Generate'}
              </Button>
            </div>
            {!drafts && !drafting && (
              <div className="text-[11px] text-muted-foreground">Click Generate for 3 tone variants you can edit before sending.</div>
            )}
            {drafts && (
              <div className="space-y-1.5">
                {([
                  { key: 'acknowledge', label: 'Acknowledge', tone: 'bg-blue-100 text-blue-800' },
                  { key: 'action_plan', label: 'Action plan', tone: 'bg-emerald-100 text-emerald-800' },
                  { key: 'need_info', label: 'Need info', tone: 'bg-amber-100 text-amber-800' },
                ] as const).map(t => (
                  <button key={t.key} type="button" onClick={() => pickDraft((drafts as any)[t.key])}
                    className="block w-full text-left rounded-md border bg-card p-2 hover:border-primary transition-colors">
                    <Badge className={cn("text-[9px] mb-1", t.tone)}>{t.label}</Badge>
                    <div className="text-xs">{(drafts as any)[t.key] || '—'}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply text */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium">Your reply</label>
              {usedAiDraft && <Badge variant="outline" className="text-[9px]"><Sparkles className="w-2.5 h-2.5 mr-0.5" />AI-assisted</Badge>}
            </div>
            <Textarea
              value={reply}
              onChange={e => { setReply(e.target.value); if (usedAiDraft) setUsedAiDraft(true); }}
              placeholder="Type or pick an AI draft above…"
              rows={4}
              className="text-sm"
            />
          </div>

          {/* Attachments list */}
          {attachments.length > 0 && (
            <div className="space-y-1.5">
              {attachments.map((a, i) => {
                const isImg = a.mime?.startsWith('image/');
                return (
                  <div key={i} className="flex gap-2 p-2 rounded-md border bg-card">
                    <div className="w-12 h-12 bg-muted rounded overflow-hidden shrink-0">
                      {isImg ? <img src={a.url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><FileText className="w-4 h-4" /></div>}
                    </div>
                    <div className="flex-1 min-w-0 text-[11px]">
                      <div className="flex items-center gap-1">
                        <div className="font-medium truncate flex-1">{a.name}</div>
                        <button onClick={() => setAttachments(arr => arr.filter((_, j) => j !== i))} className="text-destructive p-0.5"><X className="w-3 h-3" /></button>
                      </div>
                      {a.summary && (
                        <div className="text-muted-foreground mt-0.5 line-clamp-2">
                          <Sparkles className="w-2.5 h-2.5 inline mr-0.5 text-violet-600" />{a.summary}
                        </div>
                      )}
                      {a.suggested_action && (
                        <div className="text-emerald-700 mt-0.5 line-clamp-1">→ {a.suggested_action}</div>
                      )}
                    </div>
                  </div>
                );
              })}
              {attachments.some(a => a.suggested_action) && (
                <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={useSuggested}>
                  <Sparkles className="w-3 h-3 mr-1" />Append suggested actions to reply
                </Button>
              )}
            </div>
          )}

          {/* Pending uploads */}
          {pending.map(p => (
            <div key={p.id} className="flex gap-2 p-2 rounded-md border bg-muted/30">
              <div className="w-12 h-12 bg-muted rounded overflow-hidden shrink-0">
                {p.preview ? <img src={p.preview} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><FileText className="w-4 h-4" /></div>}
              </div>
              <div className="flex-1 min-w-0 text-[11px]">
                <div className="font-medium truncate">{p.file.name}</div>
                <Progress value={p.progress} className="h-1.5 mt-1" />
                <div className="text-[10px] mt-0.5 inline-flex items-center gap-1 text-muted-foreground">
                  {p.status === 'error' ? <><AlertCircle className="w-2.5 h-2.5 text-destructive" />{p.error}</>
                    : p.status === 'done' ? <><CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />Ready</>
                    : p.status === 'summarizing' ? <><Sparkles className="w-2.5 h-2.5 animate-pulse" />AI summarizing…</>
                    : <><Loader2 className="w-2.5 h-2.5 animate-spin" />Uploading…</>}
                </div>
              </div>
            </div>
          ))}

          {/* Drop zone */}
          {attachments.length + pending.length < MAX_FILES && (
            <div
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors',
                drag ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
              )}
            >
              <input ref={inputRef} type="file" hidden multiple accept={ACCEPT}
                onChange={e => { const fs = Array.from(e.target.files || []); e.target.value = ''; if (fs.length) upload(fs); }} />
              <Paperclip className="w-4 h-4 mx-auto text-muted-foreground" />
              <div className="text-[11px] font-medium mt-1">Drop or click to attach</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">
                Images, PDF, audio · Max {MAX_FILES} files, {MAX_MB}MB each · AI summarizes each automatically
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
          <Button size="sm" onClick={send} disabled={sending || !reply.trim() || pending.some(p => p.status === 'uploading' || p.status === 'summarizing')}>
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
            Send reply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InboxReplyComposer;
