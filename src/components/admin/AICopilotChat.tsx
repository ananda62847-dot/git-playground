import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Send, Loader2, User as UserIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

type Msg = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  'How many problems are pending in my constituency?',
  'Forecast tomorrow load',
  'Which cadres have the highest workload?',
  'Show all open water complaints from this week',
];

const AICopilotChat: React.FC = () => {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hi! I'm your **AI Copilot**. Ask me about problems, cadres, escalations, or tell me to reassign / notify / forecast. I'll act on real data." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: 'user', content }];
    setMessages(next); setInput(''); setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-copilot', {
        body: { messages: next },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages([...next, { role: 'assistant', content: data?.reply || '...' }]);
    } catch (e: any) {
      toast.error(e?.message ?? 'Copilot failed');
      setMessages([...next, { role: 'assistant', content: `⚠️ ${e?.message ?? 'Something went wrong'}` }]);
    } finally { setLoading(false); }
  };

  return (
    <Card>
      <CardContent className="p-0 flex flex-col h-[600px]">
        <div className="border-b border-border p-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-violet-500/15 text-violet-700 flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-sm">AI Copilot</div>
            <div className="text-[10px] text-muted-foreground">Acts on real data · tool-calling enabled</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-violet-500/15 text-violet-700'}`}>
                {m.role === 'user' ? <UserIcon className="w-3.5 h-3.5" /> : <Brain className="w-3.5 h-3.5" />}
              </div>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-violet-500/15 text-violet-700 flex items-center justify-center"><Brain className="w-3.5 h-3.5" /></div>
              <div className="bg-muted rounded-lg px-3 py-2 text-sm inline-flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" />Thinking…</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {messages.length <= 2 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)} className="text-[11px] px-2 py-1 rounded-full bg-muted hover:bg-muted/70 border border-border">{s}</button>
            ))}
          </div>
        )}

        <div className="border-t border-border p-2 flex gap-2">
          <Textarea
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask anything or tell me to act…" rows={1}
            className="text-sm resize-none min-h-[40px] max-h-32"
          />
          <Button onClick={() => send()} disabled={loading || !input.trim()} size="icon"><Send className="w-4 h-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AICopilotChat;
