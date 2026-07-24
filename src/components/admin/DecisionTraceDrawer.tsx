import React, { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { fmtIST } from '@/lib/datetime';
import { Sparkles, Bot } from 'lucide-react';

const AGENT_LABEL: Record<string, string> = {
  smart_assignment: 'Smart Assignment',
  follow_up: 'Follow-up',
  escalation: 'Escalation',
  prediction: 'Prediction',
  verification: 'Verification',
  sentiment: 'Sentiment',
};

const STATUS_COLOR: Record<string, string> = {
  auto_applied: 'bg-emerald-600 text-white',
  approved: 'bg-blue-600 text-white',
  overridden: 'bg-purple-600 text-white',
  rejected: 'bg-rose-600 text-white',
  pending_review: 'bg-amber-500 text-white',
};

interface Props {
  open: boolean;
  title: string;
  decisions: any[];
  policies: any[];
  onClose: () => void;
}

const ruleText = (p: any) => {
  if (!p) return 'No policy configured for this agent — defaulting to manual review.';
  if (p.mode === 'auto') {
    return `Auto mode: applies decisions at ≥ ${p.confidence_threshold}% confidence, capped at ${p.daily_cap || '∞'} per day. Below threshold → queued.`;
  }
  if (p.mode === 'suggest') return 'Suggest mode: every decision is queued for admin approval regardless of confidence.';
  return 'Disabled — agent is off.';
};

const DecisionTraceDrawer: React.FC<Props> = ({ open, title, decisions, policies, onClose }) => {
  const policyByAgent = useMemo(() => {
    const m: Record<string, any> = {};
    policies.forEach(p => { m[p.agent_type] = p; });
    return m;
  }, [policies]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-3 text-xs text-muted-foreground">{decisions.length} matching decision{decisions.length === 1 ? '' : 's'}</div>

        {decisions.length === 0 ? (
          <div className="mt-6 text-sm text-muted-foreground text-center py-8">No decisions match this filter.</div>
        ) : (
          <Accordion type="single" collapsible className="mt-3">
            {decisions.slice(0, 50).map((d) => {
              const pol = policyByAgent[d.agent_type];
              const inputs = d.metadata && typeof d.metadata === 'object' ? d.metadata : {};
              return (
                <AccordionItem key={d.id} value={d.id}>
                  <AccordionTrigger className="text-left text-xs hover:no-underline">
                    <div className="flex items-center justify-between w-full gap-2 pr-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Bot className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        <span className="font-semibold truncate">{AGENT_LABEL[d.agent_type] || d.agent_type}</span>
                        <Badge className={`text-[10px] ${STATUS_COLOR[d.status] || 'bg-slate-500 text-white'}`}>{d.status}</Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{fmtIST(d.created_at)}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs space-y-3 pl-1">
                    <div>
                      <div className="font-bold text-[10px] uppercase text-muted-foreground mb-0.5">Action</div>
                      <div className="font-mono">{d.action} {typeof d.confidence === 'number' && <span className="text-muted-foreground">· {d.confidence}% confidence</span>}</div>
                    </div>
                    <div>
                      <div className="font-bold text-[10px] uppercase text-muted-foreground mb-0.5">Policy rule that fired</div>
                      <div className="bg-muted/40 rounded p-2 leading-relaxed">{ruleText(pol)}</div>
                    </div>
                    <div>
                      <div className="font-bold text-[10px] uppercase text-muted-foreground mb-0.5">Reason</div>
                      <div className="italic text-muted-foreground">{d.reason || '—'}</div>
                    </div>
                    <div>
                      <div className="font-bold text-[10px] uppercase text-muted-foreground mb-0.5">Inputs / signals</div>
                      {Object.keys(inputs).length === 0 ? (
                        <div className="text-muted-foreground italic">No structured inputs recorded.</div>
                      ) : (
                        <ul className="space-y-0.5">
                          {Object.entries(inputs).slice(0, 12).map(([k, v]) => (
                            <li key={k} className="flex gap-2"><span className="text-muted-foreground min-w-[100px] truncate">{k}</span><span className="font-mono break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span></li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {(d.applied_at || d.reviewed_at || d.override_reason) && (
                      <div>
                        <div className="font-bold text-[10px] uppercase text-muted-foreground mb-0.5">Outcome</div>
                        {d.applied_at && <div>Applied: {fmtIST(d.applied_at)}</div>}
                        {d.reviewed_at && <div>Reviewed: {fmtIST(d.reviewed_at)}</div>}
                        {d.override_reason && <div>Override: <span className="italic">{d.override_reason}</span></div>}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default DecisionTraceDrawer;
