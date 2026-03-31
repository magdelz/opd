import { useState, useEffect, useId, useRef } from 'react';
import { MessageCircle, Heart, Ban } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { getHiddenCategories, isBanned, banUser } from '../lib/banManager';
import { Avatar } from '../components/Avatar';
import { AutocompleteInput } from '../components/AutocompleteInput';
import { UNIVERSITIES_LIST, DORMITORIES_LIST } from '../lib/constants';

type UserProfile = {
  id: string;
  full_name: string;
  age: number | null;
  university: string | null;
  dormitory: string | null;
  bio: string | null;
  gender: string | null;
  avatar_url: string | null;
  interests: string[];
  interestCategories: string[];
};

type SearchPageProps = { onNavigate: (page: string) => void; };

// Removed local TypeaheadInput, now using global AutocompleteInput

function SearchUserCard({ profile, onMessage, onMatch, onBan, delayMs = 0, t }: {
  profile: UserProfile; onMessage: (id: string) => void; onMatch: (id: string) => void;
  onBan: (id: string) => void; delayMs?: number; t: (key: string) => string;
}) {
  return (
    <div
      className="card-fade rounded-2xl bg-white shadow-sm hover:shadow-xl transition-all transform hover:-translate-y-2 overflow-hidden p-6 border border-slate-100 card-accent"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <style>{`
        @keyframes cardFade { from {opacity:0; transform: translateY(16px)} to {opacity:1; transform: translateY(0)} }
        .card-fade { animation: cardFade .45s ease-out forwards; }
      `}</style>

      <div className="flex justify-center mb-5">
        <Avatar url={profile.avatar_url} altText={profile.full_name} className="!w-20 !h-20 text-3xl shadow-md" />
      </div>

      <div className="text-center">
        <h3 className="text-xl font-bold text-slate-900">
          {profile.full_name}
          {profile.age ? <span className="text-slate-500 text-lg font-medium">, {profile.age}</span> : null}
        </h3>
        {profile.university && <p className="text-slate-600 mt-1 text-sm">{profile.university}</p>}
        {profile.dormitory && <p className="text-slate-600 text-sm">{profile.dormitory}</p>}
      </div>

      {profile.bio && <p className="text-center text-slate-700 mt-4 text-sm italic">"{profile.bio}"</p>}

      {profile.interests?.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {profile.interests.slice(0, 4).map((tag, i) => (
            <span key={i} className="bg-slate-100 text-slate-700 text-xs px-3 py-1 rounded-full border border-slate-200">{tag}</span>
          ))}
          {profile.interests.length > 4 && <span className="text-xs text-slate-500">+{profile.interests.length - 4}</span>}
        </div>
      )}

      <div className="mt-6 flex justify-center gap-2">
        <button onClick={() => onMessage(profile.id)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-medium transition-all shadow-md text-sm">
          <MessageCircle className="w-4 h-4" /> {t('search.write')}
        </button>
        <button onClick={() => onMatch(profile.id)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition" title="❤️">
          <Heart className="w-5 h-5 text-rose-500" />
        </button>
        <button onClick={() => onBan(profile.id)} className="p-2 rounded-xl border border-slate-200 hover:bg-red-50 transition" title={t('search.ban')}>
          <Ban className="w-4 h-4 text-slate-400 hover:text-red-500" />
        </button>
      </div>
    </div>
  );
}

const UNIVERSITY_DORMS: Record<string, string[]> = {
  'НГУ (Новосибирск)': ['Общежитие №1', 'Общежитие №2', 'Студгородок Северный'],
  'МГУ имени М.В. Ломоносова': ['ДСЛ МГУ', 'ДСВ МГУ', 'ДАС МГУ', 'ФДС МГУ'],
};

export function SearchPage({ onNavigate }: SearchPageProps) {
  const { user } = useAuth();
  const { t } = useLang();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ university: '', dormitory: '', gender: '', category: '' });

  useEffect(() => { loadUsers(); }, [user]);

  const loadUsers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('*').neq('id', user.id);
      if (profiles) {
        const usersWithInterests = await Promise.all(
          profiles.map(async (profile) => {
            const { data: userInterests } = await supabase
              .from('user_interests')
              .select('interest_id, interests(name, category)')
              .eq('user_id', profile.id);
            return {
              ...profile,
              interests: userInterests?.map((ui: any) => ui.interests.name) || [],
              interestCategories: userInterests?.map((ui: any) => ui.interests.category) || [],
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
    const { data: existingConversation } = await supabase.from('conversations').select('id')
      .or(`and(user1_id.eq.${conversationUsers[0]},user2_id.eq.${conversationUsers[1]}),and(user1_id.eq.${conversationUsers[1]},user2_id.eq.${conversationUsers[0]})`)
      .maybeSingle();
    if (!existingConversation) {
      await supabase.from('conversations').insert({ user1_id: conversationUsers[0], user2_id: conversationUsers[1] });
    }
    onNavigate('messages');
  };

  const handleMatch = async (userId: string) => {
    if (!user) return;
    await supabase.from('matches').insert({ user_id: user.id, matched_user_id: userId, status: 'pending' });
    loadUsers();
  };

  const handleBan = (userId: string) => {
    if (confirm(t('misc.confirm_ban'))) {
      banUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  const hiddenCats = getHiddenCategories();

  const filteredUsers = users.filter(u => {
    if (isBanned(u.id)) return false;
    if (filters.university && u.university !== filters.university) return false;
    if (filters.dormitory && u.dormitory !== filters.dormitory) return false;
    if (filters.gender && u.gender !== filters.gender) return false;
    // Filter by hidden categories
    if (hiddenCats.length > 0 && u.interestCategories.length > 0) {
      const hasVisibleInterest = u.interestCategories.some(cat => !hiddenCats.includes(cat));
      if (!hasVisibleInterest) return false;
    }
    return true;
  });

  const universitiesFromDB = [...new Set(users.map(u => u.university).filter(Boolean))] as string[];
  const universities = [...new Set([...UNIVERSITIES_LIST, ...universitiesFromDB])];
  const dormitoriesFromDB = [...new Set(users.map(u => u.dormitory).filter(Boolean))] as string[];
  const dormitoryOptions = filters.university && UNIVERSITY_DORMS[filters.university]
    ? UNIVERSITY_DORMS[filters.university]
    : [...new Set([...DORMITORIES_LIST, ...dormitoriesFromDB])];

  useEffect(() => {
    if (filters.dormitory && !dormitoryOptions.includes(filters.dormitory)) {
      setFilters(f => ({ ...f, dormitory: '' }));
    }
  }, [filters.university]);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-8">{t('search.title')}</h1>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 card-accent">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('search.filters')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">{t('setup.university')}</label>
              <AutocompleteInput 
                value={filters.university}
                onChange={(v) => setFilters({ ...filters, university: v })}
                suggestions={universities}
                className="h-11 w-full px-4 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">{t('setup.dormitory')}</label>
              <AutocompleteInput 
                value={filters.dormitory}
                onChange={(v) => setFilters({ ...filters, dormitory: v })}
                suggestions={dormitoryOptions}
                className="h-11 w-full px-4 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">{t('setup.gender')}</label>
              <select value={filters.gender}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                className="h-11 w-full px-4 border border-slate-200 rounded-xl bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option value="">{t('search.any_gender')}</option>
                <option value="male">{t('setup.gender_male')}</option>
                <option value="female">{t('setup.gender_female')}</option>
              </select>
            </div>
            <button onClick={() => setFilters({ university: '', dormitory: '', gender: '', category: '' })}
              className="h-11 px-4 whitespace-nowrap border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium">
              {t('search.reset')}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-slate-600">{t('search.loading')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((profile, idx) => (
              <SearchUserCard key={profile.id} profile={profile} onMessage={handleMessage}
                onMatch={handleMatch} onBan={handleBan} delayMs={idx * 70} t={t} />
            ))}
          </div>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl card-accent">
            <p className="text-slate-600 text-lg">{t('search.no_users')}</p>
            <button onClick={() => setFilters({ university: '', dormitory: '', gender: '', category: '' })}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium">
              {t('search.reset')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
