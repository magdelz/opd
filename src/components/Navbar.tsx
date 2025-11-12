import React from 'react';
import { Search, Users, MessageCircle, Calendar, User, LogOut, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type NavbarProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
};

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      onNavigate('home');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // --- плавающий индикатор (pill) ---
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const btnRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [pill, setPill] = React.useState<{ left: number; width: number; height: number }>({
    left: 0,
    width: 0,
    height: 36,
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

  // элементы навигации для авторизованного пользователя
  const authedItems = [
    { key: 'search',    label: 'Поиск',       icon: <Search className="w-5 h-5" />,    onClick: () => onNavigate('search') },
    { key: 'matches',   label: 'Совпадения',  icon: <Users className="w-5 h-5" />,     onClick: () => onNavigate('matches') },
    { key: 'messages',  label: 'Сообщения',   icon: <MessageCircle className="w-5 h-5" />, onClick: () => onNavigate('messages') },
    { key: 'events',    label: 'События',     icon: <Calendar className="w-5 h-5" />,  onClick: () => onNavigate('events') },
    { key: 'profile',   label: 'Профиль',     icon: <User className="w-5 h-5" />,      onClick: () => onNavigate('profile') },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Логотип */}
          <div
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onNavigate('home')}
          >
            <Home className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">Сосед по интересам</span>
          </div>

          {/* Правый блок */}
          {user && profile ? (
            <div className="relative">
              {/* Контейнер кнопок с плавающим индикатором */}
              <div
                ref={wrapRef}
                className="relative flex items-center gap-2"
                style={{ minHeight: 36 }}
              >
                {/* Плавающий скруглённый прямоугольник (под активной кнопкой) */}
                <div
                  aria-hidden
                  className="absolute top-1/2 -translate-y-1/2 rounded-xl bg-blue-100"
                  style={{
                    left: pill.left,
                    width: pill.width,
                    height: pill.height,
                    transition: 'left 260ms cubic-bezier(.2,.8,.2,1), width 260ms cubic-bezier(.2,.8,.2,1)',
                    boxShadow: '0 4px 18px rgba(37, 99, 235, 0.15)', // мягкое свечение
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
                        'relative z-10 inline-flex items-center gap-2 px-3 py-2 rounded-lg',
                        'text-sm font-medium transition-colors',
                        isActive ? 'text-blue-700' : 'text-gray-600 hover:text-gray-900',
                      ].join(' ')}
                    >
                      <span className="shrink-0">{it.icon}</span>
                      <span className="hidden sm:inline whitespace-nowrap">{it.label}</span>
                    </button>
                  );
                })}

                {/* Выйти */}
                <button
                  onClick={handleSignOut}
                  className="ml-3 relative z-10 inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden sm:inline">Выйти</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <button
                onClick={() => onNavigate('login')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Войти
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Регистрация
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
