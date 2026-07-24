import React, { useRef, useState, useEffect } from 'react';
import { Mic, Square, Loader2, Play, Pause, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  /** Called once recording is uploaded + transcribed. */
  onProcessed: (data: { voice_note_url: string; transcript: string; title: string; description: string }) => void;
  /** Optional language hint for Whisper, e.g. 'ta', 'en'. */
  language?: string;
  /** Subfolder in voice-notes bucket */
  folder?: string;
}

const MAX_SECONDS = 90;

const VoiceNoteRecorder: React.FC<Props> = ({ onProcessed, language, folder = 'reports' }) => {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [audioEl] = useState<HTMLAudioElement>(() => new Audio());
  const [playing, setPlaying] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (timerRef.current) window.clearInterval(timerRef.current);
    try { mediaRef.current?.stream.getTracks().forEach(t => t.stop()); } catch {}
  }, [previewUrl]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Microphone not supported in this browser');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '');
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        setBlob(b);
        const url = URL.createObjectURL(b);
        setPreviewUrl(url);
        audioEl.src = url;
        rec.stream.getTracks().forEach(t => t.stop());
      };
      rec.start(250);
      mediaRef.current = rec;
      setRecording(true);
      setSeconds(0);
      setDone(false);
      timerRef.current = window.setInterval(() => {
        setSeconds(s => {
          if (s + 1 >= MAX_SECONDS) { stop(); return s + 1; }
          return s + 1;
        });
      }, 1000);
    } catch (err: any) {
      const name = err?.name;
      if (name === 'NotAllowedError') toast.error('Microphone permission denied. Enable mic in browser settings.');
      else if (name === 'NotFoundError') toast.error('No microphone found.');
      else if (name === 'NotReadableError') toast.error('Microphone in use by another app.');
      else toast.error('Could not start recording');
    }
  };

  const stop = () => {
    try { mediaRef.current?.stop(); } catch {}
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
  };

  const togglePlay = () => {
    if (!previewUrl) return;
    if (playing) { audioEl.pause(); setPlaying(false); }
    else {
      audioEl.play().then(() => setPlaying(true)).catch(() => {});
      audioEl.onended = () => setPlaying(false);
    }
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setBlob(null); setPreviewUrl(null); setSeconds(0); setDone(false);
    audioEl.pause(); setPlaying(false);
  };

  const transcribe = async () => {
    if (!blob) return;
    setProcessing(true);
    try {
      const ext = (blob.type.includes('webm') ? 'webm' : 'wav');
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('voice-notes').upload(path, blob, {
        contentType: blob.type || 'audio/webm',
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('voice-notes').getPublicUrl(path);
      const voice_note_url = pub.publicUrl;

      const { data, error } = await supabase.functions.invoke('transcribe-voice', {
        body: { audioUrl: voice_note_url, language },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      onProcessed({
        voice_note_url,
        transcript: (data as any).transcript || '',
        title: (data as any).title || '',
        description: (data as any).description || '',
      });
      setDone(true);
      toast.success('Voice transcribed — title and description filled');
    } catch (e: any) {
      toast.error(e?.message || 'Transcription failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        Voice note · AI fills title &amp; description
      </div>

      {!blob && (
        <div className="flex items-center gap-2">
          {!recording ? (
            <Button type="button" size="sm" variant="outline" onClick={start} className="flex-1">
              <Mic className="w-4 h-4 mr-1.5" /> Tap to record
            </Button>
          ) : (
            <Button type="button" size="sm" variant="destructive" onClick={stop} className="flex-1">
              <Square className="w-4 h-4 mr-1.5" /> Stop · {fmt(seconds)}
            </Button>
          )}
          {recording && (
            <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" /> REC
            </span>
          )}
        </div>
      )}

      {blob && (
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={togglePlay}>
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <span className="text-xs text-muted-foreground flex-1">
            {fmt(seconds)} recorded {done && '· transcribed ✓'}
          </span>
          {!done && (
            <Button type="button" size="sm" onClick={transcribe} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
              {processing ? 'Transcribing…' : 'Transcribe'}
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={reset} disabled={processing}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Max {MAX_SECONDS}s. Tamil &amp; English supported. The recording is attached to your complaint for the admin to hear.
      </p>
    </div>
  );
};

export default VoiceNoteRecorder;
