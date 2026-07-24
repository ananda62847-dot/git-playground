import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  problem: { id: string; ticket_no: string; title: string };
  onClose: () => void;
  onDone: () => void;
}

const ConfirmAndRateModal: React.FC<Props> = ({ problem, onClose, onDone }) => {
  const [rating, setRating] = useState(0);
  const [quality, setQuality] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [behavior, setBehavior] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!rating) { toast.error('Please give an overall rating'); return; }
    setSubmitting(true);
    try {
      const { error: e1 } = await (supabase as any).from('satisfaction_surveys').insert({
        problem_id: problem.id,
        rating,
        resolution_quality: quality || null,
        speed: speed || null,
        staff_behavior: behavior || null,
        comment: comment.trim() || null,
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from('problems')
        .update({ status: 'citizen_confirmed', citizen_confirmed: true, satisfaction_rating: rating })
        .eq('id', problem.id);
      if (e2) throw e2;
      toast.success('Thank you! Your feedback was recorded.');
      onDone();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const Stars = ({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) => (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star`}>
            <Star className={`w-7 h-7 transition ${n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-5 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-5 h-5 text-green-600" /><h3 className="font-bold text-lg">Confirm & Rate Resolution</h3></div>
        <div className="text-xs text-muted-foreground mb-4 font-mono">{problem.ticket_no}</div>
        <div className="space-y-4">
          <Stars value={rating} onChange={setRating} label="Overall satisfaction *" />
          <Stars value={quality} onChange={setQuality} label="Resolution quality" />
          <Stars value={speed} onChange={setSpeed} label="Speed of response" />
          <Stars value={behavior} onChange={setBehavior} label="Staff behavior" />
          <div>
            <div className="text-xs text-muted-foreground mb-1">Feedback (optional)</div>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Anything else to share with the admin?" rows={3} />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={submit} disabled={submitting || !rating}>
            {submitting ? 'Submitting…' : 'Confirm & Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmAndRateModal;
