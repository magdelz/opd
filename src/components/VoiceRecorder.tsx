import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react';

type VoiceRecorderProps = {
  onSend: (audioUrl: string, duration: number) => void;
};

export function VoiceRecorder({ onSend }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const cancelRecording = () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setDuration(0);
  };

  const sendVoice = () => {
    if (audioUrl) {
      onSend(audioUrl, duration);
      setAudioUrl(null);
      setDuration(0);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (audioUrl) {
    return (
      <div className="flex items-center gap-2">
        <VoicePlayer url={audioUrl} duration={duration} />
        <button onClick={cancelRecording} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={sendVoice}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-sm font-medium hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md"
        >
          Отправить
        </button>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-600 font-mono text-sm">{formatTime(duration)}</span>
        </div>
        <button
          onClick={stopRecording}
          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          onClick={cancelRecording}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      title="Голосовое сообщение"
    >
      <Mic className="w-5 h-5" />
    </button>
  );
}

// Mini voice player for chat messages
type VoicePlayerProps = {
  url: string;
  duration: number;
};

export function VoicePlayer({ url, duration }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const animRef = useRef<number>();

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    } else {
      audioRef.current.play();
      setPlaying(true);
      tick();
    }
  };

  const tick = () => {
    if (!audioRef.current) return;
    setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1));
    animRef.current = requestAnimationFrame(tick);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl min-w-[160px]">
      <audio
        ref={audioRef}
        src={url}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <button onClick={togglePlay} className="p-1 text-blue-600 hover:text-blue-700">
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      {/* Progress bar */}
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 font-mono">{formatTime(duration)}</span>
    </div>
  );
}
