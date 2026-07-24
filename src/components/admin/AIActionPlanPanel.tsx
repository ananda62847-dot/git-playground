import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { fmtIST } from '@/lib/datetime';

type Kind = 'problem' | 'welfare' | 'corruption';

interface Props {
  kind: Kind;
  id: string;
  initialPlan?: string | null;
  initialAt?: string | null;
  /** Auto-generate on mount if no plan exists. Defaults to true. */
  autoGenerate?: boolean;
}

/** AI-generated action plan. Auto-generates on mount when missing; renders markdown. */
const AIActionPlanPanel: React.FC<Props> = ({ kind, id, initialPlan, initialAt, autoGenerate = true }) => {
  const [plan, setPlan] = useState<string | null>(initialPlan || null);
  const [at, setAt] = useState<string | null>(initialAt || null);
  const [loading, setLoading] = useState(false);
  const triggered = useRef(false);

  const generate = async (force = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-action-plan', { body: { kind, id, force } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPlan(data.plan);
      setAt(data.at || new Date().toISOString());
    } catch (e: any) {
      toast.error(e?.message || 'AI failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoGenerate && !plan && !triggered.current) {
      triggered.current = true;
      generate(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <section className="border-t pt-4">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> SMART RESOLUTION WORKFLOW
          <span className="text-[9px] font-normal text-muted-foreground/70 ml-1 px-1.5 py-0.5 bg-primary/10 rounded">AI-generated</span>
        </div>
        {plan && autoGenerate && (
          <Button size="sm" variant="ghost" onClick={() => generate(true)} disabled={loading} className="h-7 text-[11px]">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            <span className="ml-1">Regenerate</span>
          </Button>
        )}
      </div>

      {loading && !plan && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Generating Smart Resolution Workflow…
        </div>
      )}

      {plan && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm">
          <div className="prose prose-sm dark:prose-invert max-w-none break-words
            prose-p:my-1.5 prose-ol:my-1.5 prose-ul:my-1.5 prose-li:my-0.5
            prose-headings:mt-3 prose-headings:mb-1.5 prose-strong:text-foreground">
            <ReactMarkdown>{plan}</ReactMarkdown>
          </div>
          {at && (
            <div className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-primary/10 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              AI-generated · {fmtIST(at)}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default AIActionPlanPanel;
