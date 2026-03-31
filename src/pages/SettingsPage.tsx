import { useState, useEffect } from 'react';
import { Globe, Eye, EyeOff, Type, Zap, Shield, ChevronRight } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import { useA11y } from '../contexts/AccessibilityContext';
import { getBannedUsers, unbanUser, getHiddenCategories, toggleHiddenCategory } from '../lib/banManager';
import { supabase } from '../lib/supabase';
import type { Lang } from '../lib/translations';

type SettingsPageProps = {
  onNavigate: (page: string) => void;
};

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  const { lang, setLang, t } = useLang();
  const { highContrast, largeText, reduceMotion, toggleHighContrast, toggleLargeText, toggleReduceMotion } = useA11y();
  const [bannedUsers, setBannedUsers] = useState<{ id: string; name: string }[]>([]);
  const [hiddenCats, setHiddenCats] = useState<string[]>(getHiddenCategories());

  const allCategories = [
    { key: 'sport', label: t('cat.sport'), emoji: '🏀' },
    { key: 'games', label: t('cat.games'), emoji: '🎮' },
    { key: 'study', label: t('cat.study'), emoji: '📚' },
    { key: 'hobby', label: t('cat.hobby'), emoji: '🎨' },
    { key: 'other', label: t('cat.other'), emoji: '💬' },
  ];

  const languages: { code: Lang; label: string; flag: string }[] = [
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
  ];

  useEffect(() => {
    loadBannedUsers();
  }, []);

  const loadBannedUsers = async () => {
    const ids = getBannedUsers();
    if (ids.length === 0) { setBannedUsers([]); return; }

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', ids);

    setBannedUsers((data || []).map((p: any) => ({ id: p.id, name: p.full_name })));
  };

  const handleUnban = (userId: string) => {
    unbanUser(userId);
    setBannedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleToggleCategory = (cat: string) => {
    toggleHiddenCategory(cat);
    setHiddenCats(getHiddenCategories());
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-extrabold text-slate-900">{t('settings.title')}</h1>

        {/* Language */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-5 border-b border-slate-100">
            <Globe className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900">{t('settings.language')}</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3">
              {languages.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                    lang === l.code
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md scale-[1.02]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="text-lg">{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Accessibility */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-5 border-b border-slate-100">
            <Eye className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-slate-900">{t('settings.accessibility')}</h2>
          </div>
          <div className="divide-y divide-slate-100">
            <ToggleRow
              icon={<Eye className="w-4 h-4" />}
              label={t('settings.high_contrast')}
              checked={highContrast}
              onChange={toggleHighContrast}
            />
            <ToggleRow
              icon={<Type className="w-4 h-4" />}
              label={t('settings.large_text')}
              checked={largeText}
              onChange={toggleLargeText}
            />
            <ToggleRow
              icon={<Zap className="w-4 h-4" />}
              label={t('settings.reduce_motion')}
              checked={reduceMotion}
              onChange={toggleReduceMotion}
            />
          </div>
        </div>

        {/* Blocked users */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-5 border-b border-slate-100">
            <Shield className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-900">{t('settings.blocked')}</h2>
          </div>
          <div className="p-5">
            {bannedUsers.length === 0 ? (
              <p className="text-center text-slate-400 py-4">{t('settings.no_blocked')}</p>
            ) : (
              <div className="space-y-2">
                {bannedUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl">
                    <span className="font-medium text-slate-700">{u.name}</span>
                    <button
                      onClick={() => handleUnban(u.id)}
                      className="px-3 py-1 text-xs border border-emerald-200 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      {t('settings.unblock')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Hidden categories */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-5 border-b border-slate-100">
            <EyeOff className="w-5 h-5 text-orange-500" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t('settings.hidden_cats')}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{t('settings.hidden_cats_desc')}</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {allCategories.map(cat => (
              <ToggleRow
                key={cat.key}
                icon={<span className="text-base">{cat.emoji}</span>}
                label={cat.label}
                checked={hiddenCats.includes(cat.key)}
                onChange={() => handleToggleCategory(cat.key)}
                inverted
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ icon, label, checked, onChange, inverted }: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: () => void;
  inverted?: boolean;
}) {
  const isActive = inverted ? checked : checked;
  return (
    <div className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={onChange}>
      <div className="flex items-center gap-3">
        <span className="text-slate-500">{icon}</span>
        <span className="font-medium text-slate-700">{label}</span>
      </div>
      <div className={`w-11 h-6 rounded-full transition-colors relative ${
        isActive ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-slate-200'
      }`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          isActive ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`} />
      </div>
    </div>
  );
}
