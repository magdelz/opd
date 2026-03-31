import { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';

type CallModalProps = {
  userName: string;
  userInitial: string;
  onClose: () => void;
};

export function CallModal({ userName, userInitial, onClose }: CallModalProps) {
  const { t } = useLang();
  const [phase, setPhase] = useState<'calling' | 'connected' | 'beta'>('calling');
  const [muted, setMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [timer, setTimer] = useState(0);

  // After 3 seconds of "calling", show beta notice
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPhase('beta');
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  // Timer for connected state
  useEffect(() => {
    if (phase !== 'connected') return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl shadow-2xl w-80 overflow-hidden animate-scale-in">
        {/* Close */}
        <div className="flex justify-end p-3">
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar & info */}
        <div className="flex flex-col items-center pb-6">
          <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-400 flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-blue-500/30 mb-4">
            {userInitial}
          </div>
          <h3 className="text-white text-xl font-bold">{userName}</h3>

          {phase === 'calling' && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
              </div>
              <p className="text-blue-300 text-sm">{t('call.calling')}</p>
            </div>
          )}

          {phase === 'connected' && (
            <p className="text-green-400 text-sm mt-2">{formatTime(timer)}</p>
          )}

          {phase === 'beta' && (
            <div className="mt-4 mx-6 p-4 bg-blue-500/20 rounded-xl border border-blue-400/30">
              <p className="text-blue-200 text-sm text-center">{t('call.beta')}</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 pb-8">
          <button
            onClick={() => setMuted(!muted)}
            className={`p-4 rounded-full transition-all ${muted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`}
            title={muted ? t('call.unmute') : t('call.mute')}
          >
            {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setVideoOn(!videoOn)}
            className={`p-4 rounded-full transition-all ${videoOn ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white hover:bg-white/20'}`}
            title={t('call.video_start')}
          >
            {videoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <button
            onClick={onClose}
            className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/30"
            title={t('call.end')}
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
