import React from 'react';
import { Search, Users, MessageCircle, Calendar, User, LogOut, Home, FileText, Settings, Eye, EyeOff, UsersRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { useA11y } from '../contexts/AccessibilityContext';
import { Avatar } from './Avatar';

type NavbarProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
};

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { user, profile, signOut } = useAuth();
  const { t } = useLang();
  const { highContrast, toggleHighContrast } = useA11y();

  const handleSignOut = async () => {
    try {
      await signOut();
      onNavigate('home');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const wrapRef = React.useRef<HTMLDivElement>(null);
  const btnRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [pill, setPill] = React.useState<{ left: number; width: number; height: number }>({
    left: 0, width: 0, height: 36,
  });

  const recalcPill = React.useCallback(() => {
    const el = btnRefs.current[currentPage];
    const wrap = wrapRef.current;
    if (!el || !wrap) return;
    const wrapRect = wrap.getBoundingClientRect();
    const btnRect = el.getBoundingClientRect();
    setPill({
      left: btnRect.left - wrapRect.left,
      width: btnRect.width,
      height: btnRect.height,
    });
  }, [currentPage]);

  React.useEffect(() => {
    recalcPill();
    const onResize = () => recalcPill();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [recalcPill]);

  const authedItems = [
    { key: 'search', label: t('nav.search'), icon: <Search className="w-5 h-5" />, onClick: () => onNavigate('search') },
    { key: 'matches', label: t('nav.matches'), icon: <Users className="w-5 h-5" />, onClick: () => onNavigate('matches') },
    { key: 'messages', label: t('nav.messages'), icon: <MessageCircle className="w-5 h-5" />, onClick: () => onNavigate('messages') },
    { key: 'posts', label: t('nav.posts'), icon: <FileText className="w-5 h-5" />, onClick: () => onNavigate('posts') },
    { key: 'groups', label: t('nav.groups'), icon: <UsersRound className="w-5 h-5" />, onClick: () => onNavigate('groups') },
    { key: 'events', label: t('nav.events'), icon: <Calendar className="w-5 h-5" />, onClick: () => onNavigate('events') },
    { key: 'profile', label: t('nav.profile'), icon: <User className="w-5 h-5" />, onClick: () => onNavigate('profile') },
  ];


  return (
    <nav className="glass shadow-sm border-b border-slate-100/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onNavigate(user ? 'search' : 'home')}
          >
            <Home className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold text-gradient hidden sm:inline">{t('nav.brand')}</span>
          </div>

          {/* Right block */}
          {user && profile ? (
            <div className="relative">
              <div ref={wrapRef} className="relative flex items-center gap-1" style={{ minHeight: 36 }}>
                {/* Floating pill indicator */}
                <div
                  aria-hidden
                  className="absolute top-1/2 -translate-y-1/2 rounded-xl bg-blue-50"
                  style={{
                    left: pill.left,
                    width: pill.width,
                    height: pill.height,
                    transition: 'left 260ms cubic-bezier(.2,.8,.2,1), width 260ms cubic-bezier(.2,.8,.2,1)',
                    boxShadow: '0 4px 18px rgba(37, 99, 235, 0.12)',
                    pointerEvents: 'none',
                  }}
                />

                {authedItems.map((it) => {
                  const isActive = currentPage === it.key;
                  return (
                    <button
                      key={it.key}
                      ref={(r) => (btnRefs.current[it.key] = r)}
                      onClick={it.onClick}
                      className={[
                        'relative z-10 inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg',
                        'text-sm font-medium transition-colors',
                        isActive ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900',
                      ].join(' ')}
                      title={it.label}
                    >
                      <span className="shrink-0">{it.icon}</span>
                      <span className="hidden lg:inline whitespace-nowrap text-xs">{it.label}</span>
                    </button>
                  );
                })}

                {/* Avatar */}
                <div
                  className="cursor-pointer hover:scale-105 transition-transform shrink-0 ml-1"
                  onClick={() => onNavigate('profile')}
                  title={profile.full_name}
                >
                  <Avatar url={profile.avatar_url} altText={profile.full_name} size="sm" />
                </div>

                {/* Accessibility toggle */}
                <button
                  onClick={toggleHighContrast}
                  className="relative z-10 p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title={highContrast ? 'Обычный режим' : 'Режим для слабовидящих'}
                >
                  {highContrast ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>

                {/* Settings */}
                <button
                  onClick={() => onNavigate('settings')}
                  className={`relative z-10 p-2 rounded-lg transition-colors ${
                    currentPage === 'settings' ? 'text-blue-700 bg-blue-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                  title={t('nav.settings')}
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* Logout */}
                <button
                  onClick={handleSignOut}
                  className="ml-1 relative z-10 inline-flex items-center gap-1.5 px-2.5 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('nav.logout')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onNavigate('login')}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
              >
                {t('nav.login')}
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md font-medium"
              >
                {t('nav.register')}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
