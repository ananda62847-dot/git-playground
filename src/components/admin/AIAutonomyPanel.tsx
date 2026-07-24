import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Bot, Zap, ShieldCheck, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const AGENT_META: Record<string, { label: string; desc: string; icon: any }> = {
  smart_assignment: { label: 'Smart Assignment', desc: 'Auto-assigns reports to best-fit cadre/team', icon: Zap },
  follow_up: { label: 'Follow-up', desc: 'Sends nudges to cadres approaching SLA', icon: Bot },
  escalation: { label: 'Escalation', desc: 'Raises SLA breaches to next level', icon: AlertTriangle },
  prediction: { label: 'Delay Prediction', desc: 'Flags reports likely to breach SLA', icon: Sparkles },
  verification: { label: 'Proof Verification', desc: 'Reviews before/after evidence', icon: ShieldCheck },
  sentiment: { label: 'Sentiment Watch', desc: 'Detects citizen pulse spikes', icon: Sparkles },
  duplicate_detect: { label: 'Duplicate Detect', desc: 'Merges duplicate reports', icon: Bot },
  admin_action: { label: 'Admin Actions', desc: 'AI-generated action plans', icon: Sparkles },
};

const MODE_COLOR: Record<string, string> = {
  manual: 'bg-muted text-muted-foreground',
  suggest: 'bg-amber-500/15 text-amber-700 border border-amber-500/30',
  auto: 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30',
};

const AIAutonomyPanel: React.FC = () => {
  const qc = useQueryClient();

  const { data: policies = [] } = useQuery({
    queryKey: ['agent_policies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agent_policies' as any).select('*').order('agent_type');
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from('agent_policies' as any).update(patch).eq('id', id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ['agent_policies'] });
  };

  const autoCount = (policies as any[]).filter((p: any) => p.mode === 'auto' && p.enabled).length;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm flex items-center gap-2"><Bot className="w-4 h-4" />AI Autonomy</div>
            <div className="text-xs text-muted-foreground">Configure how each agent operates. Auto-mode runs without human review.</div>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">{autoCount} agents autonomous</Badge>
        </div>

        <div className="grid gap-2">
          {(policies as any[]).map((p: any) => {
            const meta = AGENT_META[p.agent_type] || { label: p.agent_type, desc: '', icon: Bot };
            const Icon = meta.icon;
            return (
              <div key={p.id} className="border rounded-lg p-3 space-y-2 bg-card">
                <div className="flex items-start gap-2 flex-wrap">
                  <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{meta.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{meta.desc}</div>
                  </div>
                  <Badge className={`text-[10px] capitalize ${MODE_COLOR[p.mode]}`}>{p.mode}</Badge>
                  <Switch checked={p.enabled} onCheckedChange={(v) => update(p.id, { enabled: v })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center pt-1">
                  <Select value={p.mode} onValueChange={(v) => update(p.id, { mode: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual only</SelectItem>
                      <SelectItem value="suggest">Suggest (human review)</SelectItem>
                      <SelectItem value="auto">Auto-execute</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-[10px] text-muted-foreground">
                    <div className="flex items-center justify-between"><span>Confidence ≥</span><span className="font-mono font-semibold">{p.confidence_threshold}%</span></div>
                    <Slider
                      value={[p.confidence_threshold]}
                      min={50} max={99} step={5}
                      onValueChange={([v]) => update(p.id, { confidence_threshold: v })}
                      disabled={p.mode === 'manual'}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    <label>Daily cap</label>
                    <Input
                      type="number" value={p.daily_cap}
                      onChange={(e) => update(p.id, { daily_cap: Number(e.target.value) || 0 })}
                      className="h-7 text-xs"
                      disabled={p.mode === 'manual'}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AIAutonomyPanel;
