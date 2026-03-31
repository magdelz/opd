import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';

type AuthPageProps = {
  mode: 'login' | 'register';
  onNavigate: (page: string) => void;
};

export function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signIn(email, password);
        onNavigate('profile');
      } else {
        await signUp(email, password);
        onNavigate('setup-profile');
      }
    } catch (err: any) {
      setError(err.message || t('auth.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-blue-300/30 blur-3xl animate-glow" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl animate-glow" style={{animationDelay: '1.5s'}} />
      </div>

      <div className="max-w-md w-full relative z-10 animate-slide-up">
        {/* Brand/logo above form (optional) */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight">
            {t('nav.brand')}
          </h1>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-3xl shadow-2xl p-10 card-accent relative overflow-hidden">
          {/* Decorative element inside card */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-500" />
          
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-8">
            {mode === 'login' ? t('auth.login') : t('auth.register')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {t('auth.email')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl bg-slate-50 hover:bg-white focus:bg-white transition-colors focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none placeholder-slate-400"
                placeholder="somestudent@university.edu"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {t('auth.password')}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl bg-slate-50 hover:bg-white focus:bg-white transition-colors focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none placeholder-slate-400"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50/80 backdrop-blur border border-red-200 text-red-600 px-5 py-3.5 rounded-2xl text-sm font-medium animate-scale-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-bold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed btn-glow"
            >
              {loading ? t('auth.loading') : mode === 'login' ? t('auth.submit_login') : t('auth.submit_register')}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <p className="text-slate-500 font-medium">
              {mode === 'login' ? t('auth.no_account') : t('auth.has_account')}{' '}
              <button
                onClick={() => onNavigate(mode === 'login' ? 'register' : 'login')}
                className="text-blue-600 hover:text-indigo-600 font-bold transition-colors underline decoration-blue-200 underline-offset-4 hover:decoration-indigo-600"
              >
                {mode === 'login' ? t('auth.switch_register') : t('auth.switch_login')}
              </button>
            </p>
          </div>
        </div>

        {/* Home navigation below form */}
        <div className="text-center mt-6">
          <button
            onClick={() => onNavigate('home')}
            className="text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors"
          >
            ← Вернуться на главную
          </button>
        </div>
      </div>
    </div>
  );
}
