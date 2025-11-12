import React, { useState, useEffect, useId, useRef } from 'react';
import { MessageCircle, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/* ===================== Типы ===================== */
type UserProfile = {
  id: string;
  full_name: string;
  age: number | null;
  university: string | null;
  dormitory: string | null;
  bio: string | null;
  gender: string | null;
  interests: string[];
};

type SearchPageProps = {
  onNavigate: (page: string) => void;
};

/* ===================== TypeaheadInput =====================
   Поле ввода с подсказками (typeahead). Выпадающее меню абсолютное,
   поэтому не сдвигает сетку фильтров.
=========================================================== */
function TypeaheadInput({
  label,
  value,
  onChange,
  options,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = (value
    ? options.filter(o => o.toLowerCase().startsWith(value.toLowerCase()))
    : options
  ).slice(0, 10);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="flex flex-col gap-1 relative" ref={wrapRef}>
      {label ? <label htmlFor={id} className="text-sm text-slate-600">{label}</label> : null}
      <input
        id={id}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHover(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setHover(h => Math.min(h + 1, filtered.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHover(h => Math.max(h - 1, 0)); }
          else if (e.key === 'Enter' && hover >= 0) { e.preventDefault(); onChange(filtered[hover]); setOpen(false); }
          else if (e.key === 'Escape') { setOpen(false); }
        }}
        placeholder={placeholder}
        className="h-11 w-full px-4 border border-slate-200 rounded-xl bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white shadow z-50">
          {filtered.map((opt, i) => (
            <button
              type="button"
              key={opt}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(-1)}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-4 py-2 ${i === hover ? 'bg-slate-100' : 'bg-white'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== Карточка пользователя (новая) ===================== */
function SearchUserCard({
  profile,
  onMessage,
  onMatch,
  delayMs = 0,
}: {
  profile: UserProfile;
  onMessage: (id: string) => void;
  onMatch: (id: string) => void;
  delayMs?: number;
}) {
  const initial = profile.full_name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div
      className="card-fade rounded-2xl bg-white shadow-md hover:shadow-2xl transition-all transform hover:-translate-y-2 overflow-hidden p-6 border border-slate-100"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <style>{`
        @keyframes cardFade { from {opacity:0; transform: translateY(16px)} to {opacity:1; transform: translateY(0)} }
        .card-fade { animation: cardFade .45s ease-out forwards; }
      `}</style>

      {/* Аватар */}
      <div className="flex justify-center mb-5">
        <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-400 text-white flex items-center justify-center text-3xl font-bold shadow-md">
          {initial}
        </div>
      </div>

      {/* Имя и инфо */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-slate-900">
          {profile.full_name}
          {profile.age ? <span className="text-slate-500 text-lg font-medium">, {profile.age}</span> : null}
        </h3>
        {profile.university && <p className="text-slate-600 mt-1 text-sm">{profile.university}</p>}
        {profile.dormitory && <p className="text-slate-600 text-sm">{profile.dormitory}</p>}
      </div>

      {/* Био */}
      {profile.bio && (
        <p className="text-center text-slate-700 mt-4 text-sm italic">“{profile.bio}”</p>
      )}

      {/* Интересы */}
      {profile.interests?.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {profile.interests.slice(0, 4).map((tag, i) => (
            <span
              key={i}
              className="bg-slate-100 text-slate-700 text-xs px-3 py-1 rounded-full border border-slate-200"
            >
              {tag}
            </span>
          ))}
          {profile.interests.length > 4 && (
            <span className="text-xs text-slate-500">+{profile.interests.length - 4}</span>
          )}
        </div>
      )}

      {/* Кнопки */}
      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={() => onMessage(profile.id)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-md"
        >
          <MessageCircle className="w-4 h-4" />
          Написать
        </button>
        <button
          onClick={() => onMatch(profile.id)}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition"
          title="Добавить в совпадения"
        >
          <Heart className="w-5 h-5 text-rose-500" />
        </button>
      </div>
    </div>
  );
}

/* ===================== Справочники ===================== */
const MASTER_UNIVERSITIES = [
  'МГУ им. М.В. Ломоносова',
  'СПбГУ',
  'НИУ ВШЭ',
  'МГТУ им. Н.Э. Баумана',
  'ИТМО',
  'РУДН',
  'КФУ',
  'УрФУ',
  'ТГУ (Томский гос. университет)',
  'НГУ (Новосибирский гос. университет)',
  'НГТУ (Новосибирский гос. технический университет)',
  'НГУЭУ (Новосибирский гос. университет экономики и управления)',
  'ДВФУ',
  'РАНХиГС',
  'МИФИ (НИЯУ)',
  'РТУ МИРЭА',
  'ЮФУ',
  'МГИМО',
  'РГГУ',
  'НГПУ (Новосибирский гос. пед. университет)',
  'НСУЭМ (бывш. НГУЭУ)'
];

const ALL_DORMS = [
  'Общежитие №1',
  'Общежитие №2',
  'Общежитие №3',
  'Общежитие №4',
  'Студгородок Северный',
  'Студгородок Южный',
  'Кампус на Ленинских горах',
  'Кампус Васильевский остров'
];

const UNIVERSITY_DORMS: Record<string, string[]> = {
  'НГУ (Новосибирский гос. университет)': ['Общежитие №1', 'Общежитие №2', 'Студгородок Северный'],
  'НГТУ (Новосибирский гос. технический университет)': ['Общежитие №3', 'Общежитие №4', 'Студгородок Южный'],
  'НГУЭУ (Новосибирский гос. университет экономики и управления)': ['Общежитие №2', 'Студгородок Южный'],
  'МГУ им. М.В. Ломоносова': ['Кампус на Ленинских горах'],
  'СПбГУ': ['Кампус Васильевский остров']
};

/* ===================== Страница поиска ===================== */
export function SearchPage({ onNavigate }: SearchPageProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    university: '',
    dormitory: '',
    gender: '',
    category: ''
  });

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadUsers = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id);

      if (profiles) {
        const usersWithInterests = await Promise.all(
          profiles.map(async (profile) => {
            const { data: userInterests } = await supabase
              .from('user_interests')
              .select('interest_id, interests(name)')
              .eq('user_id', profile.id);

            return {
              ...profile,
              interests: userInterests?.map((ui: any) => ui.interests.name) || []
            };
          })
        );

        setUsers(usersWithInterests as UserProfile[]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = async (userId: string) => {
    if (!user) return;

    const conversationUsers = [user.id, userId].sort();

    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(user1_id.eq.${conversationUsers[0]},user2_id.eq.${conversationUsers[1]}),and(user1_id.eq.${conversationUsers[1]},user2_id.eq.${conversationUsers[0]})`)
      .maybeSingle();

    if (!existingConversation) {
      await supabase
        .from('conversations')
        .insert({
          user1_id: conversationUsers[0],
          user2_id: conversationUsers[1]
        });
    }

    onNavigate('messages');
  };

  const handleMatch = async (userId: string) => {
    if (!user) return;

    await supabase
      .from('matches')
      .insert({
        user_id: user.id,
        matched_user_id: userId,
        status: 'pending'
      });

    loadUsers();
  };

  /* ===== Фильтрация карточек ===== */
  const filteredUsers = users.filter(u => {
    if (filters.university && u.university !== filters.university) return false;
    if (filters.dormitory && u.dormitory !== filters.dormitory) return false;
    if (filters.gender && u.gender !== filters.gender) return false;
    return true;
  });

  /* ===== Источники для typeahead ===== */
  const universitiesFromDB = [...new Set(users.map(u => u.university).filter(Boolean))] as string[];
  const universities: string[] = [...new Set([...MASTER_UNIVERSITIES, ...universitiesFromDB])];

  const dormitoriesFromDB = [...new Set(users.map(u => u.dormitory).filter(Boolean))] as string[];
  const dormitoryOptions: string[] =
    filters.university && UNIVERSITY_DORMS[filters.university]
      ? UNIVERSITY_DORMS[filters.university]
      : [...new Set([...ALL_DORMS, ...dormitoriesFromDB])];

  // сбрасываем несоответствующее общежитие при смене ВУЗа
  useEffect(() => {
    if (filters.dormitory && !dormitoryOptions.includes(filters.dormitory)) {
      setFilters(f => ({ ...f, dormitory: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.university]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Поиск соседей</h1>

        {/* Фильтры */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Фильтры</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <TypeaheadInput
              label="ВУЗ"
              value={filters.university}
              onChange={(v) => setFilters({ ...filters, university: v })}
              options={universities}
              placeholder="Начните ввод (например: НГ)"
            />

            <TypeaheadInput
              label="Общежитие"
              value={filters.dormitory}
              onChange={(v) => setFilters({ ...filters, dormitory: v })}
              options={dormitoryOptions}
              placeholder="Выберите или введите своё"
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">Пол</label>
              <select
                value={filters.gender}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                className="h-11 w-full px-4 border border-slate-200 rounded-xl bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Любой пол</option>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
              </select>
            </div>

            <button
              onClick={() => setFilters({ university: '', dormitory: '', gender: '', category: '' })}
              className="h-11 px-4 whitespace-nowrap border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Сбросить фильтры
            </button>
          </div>
        </div>

        {/* Результаты */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-gray-600">Загрузка...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((profile, idx) => (
              <SearchUserCard
                key={profile.id}
                profile={profile}
                onMessage={handleMessage}
                onMatch={handleMatch}
                delayMs={idx * 70}
              />
            ))}
          </div>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl">
            <p className="text-gray-600 text-lg">Пользователи не найдены</p>
            <button
              onClick={() => setFilters({ university: '', dormitory: '', gender: '', category: '' })}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Сбросить фильтры
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
