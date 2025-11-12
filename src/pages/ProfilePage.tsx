import React, { useState, useEffect } from 'react';
import { Edit2, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Interest } from '../lib/supabase';

type ProfilePageProps = {
  onNavigate: (page: string) => void;
};

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [userInterestNames, setUserInterestNames] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    university: '',
    dormitory: '',
    room_number: '',
    bio: '',
    gender: ''
  });

  // --- локальные keyframes (анимации) ---
  // fade/slide + «дышащий» баннер, работают без зависимостей
  const Anim = (
    <style>{`
      @keyframes fadeUp { from {opacity:0; transform: translateY(12px)} to {opacity:1; transform: translateY(0)} }
      @keyframes fade { from {opacity:0} to {opacity:1} }
      @keyframes pulseGrad { 0%{transform:scale(1)} 50%{transform:scale(1.015)} 100%{transform:scale(1)} }
      .anim-fade { animation: fade .35s ease-out both; }
      .anim-fadeup { animation: fadeUp .35s ease-out both; }
      .anim-d1 { animation-delay: .06s }
      .anim-d2 { animation-delay: .12s }
      .anim-d3 { animation-delay: .18s }
    `}</style>
  );

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        age: profile.age?.toString() || '',
        university: profile.university || '',
        dormitory: profile.dormitory || '',
        room_number: profile.room_number || '',
        bio: profile.bio || '',
        gender: profile.gender || ''
      });
      loadUserInterests();
    }
    loadInterests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const loadInterests = async () => {
    const { data } = await supabase
      .from('interests')
      .select('*')
      .order('category', { ascending: true });
    if (data) setInterests(data);
  };

  const loadUserInterests = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_interests')
      .select('interest_id, interests(id, name)')
      .eq('user_id', user.id);

    if (data) {
      setSelectedInterests(data.map((ui: any) => ui.interests.id));
      setUserInterestNames(data.map((ui: any) => ui.interests.name));
    }
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          age: formData.age ? parseInt(formData.age) : null,
          university: formData.university,
          dormitory: formData.dormitory,
          room_number: formData.room_number,
          bio: formData.bio,
          gender: formData.gender,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      await supabase.from('user_interests').delete().eq('user_id', user.id);

      if (selectedInterests.length > 0) {
        const userInterests = selectedInterests.map(interestId => ({
          user_id: user.id,
          interest_id: interestId
        }));
        const { error: interestsError } = await supabase.from('user_interests').insert(userInterests);
        if (interestsError) throw interestsError;
      }

      await refreshProfile();
      await loadUserInterests();
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // карты классов для категорий (чтобы Tailwind не «съедал» динамику)
  const categoryClasses: Record<
    string,
    { selected: string; base: string }
  > = {
    sport:  { selected: 'bg-blue-100 border-blue-500 text-blue-700',     base: 'bg-white border-gray-300 text-gray-700 hover:border-gray-400' },
    games:  { selected: 'bg-green-100 border-green-500 text-green-700',   base: 'bg-white border-gray-300 text-gray-700 hover:border-gray-400' },
    study:  { selected: 'bg-purple-100 border-purple-500 text-purple-700',base: 'bg-white border-gray-300 text-gray-700 hover:border-gray-400' },
    hobby:  { selected: 'bg-orange-100 border-orange-500 text-orange-700',base: 'bg-white border-gray-300 text-gray-700 hover:border-gray-400' },
    other:  { selected: 'bg-pink-100 border-pink-500 text-pink-700',      base: 'bg-white border-gray-300 text-gray-700 hover:border-gray-400' },
  };

  const categories = {
    sport: { name: 'Спорт' },
    games: { name: 'Игры' },
    study: { name: 'Учёба' },
    hobby: { name: 'Хобби' },
    other: { name: 'Другое' }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center anim-fadeup">
          <p className="text-slate-600 mb-4">Создай свой профиль, чтобы начать</p>
          <button
            onClick={() => onNavigate('setup-profile')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md"
          >
            Создать профиль
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {Anim}

      {/* COVER с живым градиентом и блюрами */}
      <div className="relative overflow-hidden">
        <div
          className="h-40 md:h-48 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
          style={{ animation: 'pulseGrad 10s ease-in-out infinite' }}
        />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -left-20 h-44 w-44 rounded-full bg-blue-300/40 blur-3xl" />
          <div className="absolute -bottom-10 right-10 h-60 w-60 rounded-full bg-indigo-300/40 blur-3xl" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 -mt-16 pb-10">
        {/* CARD */}
        <div className="anim-fadeup rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5 md:p-7">
          {/* Шапка карточки */}
          <div className="flex flex-col md:flex-row md:items-end gap-5">
            {/* Аватар */}
            <div className="relative">
              <div className="grid h-28 w-28 place-items-center rounded-full bg-white shadow-lg ring-4 ring-white">
                <div className="grid h-24 w-24 place-items-center rounded-full bg-blue-50 text-blue-700 text-4xl font-bold">
                  {profile.full_name?.trim().charAt(0).toUpperCase()}
                </div>
              </div>
            </div>

            {/* Имя + базовая инфа */}
            <div className="flex-1">
              <h1 className="anim-fadeup text-3xl md:text-4xl font-extrabold text-slate-900">
                {profile.full_name || 'Имя не указано'}
                {profile.age ? <span className="text-slate-500 font-medium">, {profile.age}</span> : null}
              </h1>

              <div className="anim-fadeup anim-d1 mt-3 grid gap-2 text-slate-700 text-sm md:text-[15px]">
                {profile.university && <div>{profile.university}</div>}
                {profile.dormitory && (
                  <div>
                    {profile.dormitory}
                    {profile.room_number && `, комната ${profile.room_number}`}
                  </div>
                )}
              </div>
            </div>

            {/* Кнопка редактирования/сохранения */}
            <div className="anim-fadeup md:self-start">
              <button
                onClick={() => (editing ? handleSave() : setEditing(true))}
                disabled={loading}
                className={[
                  'group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[15px] font-medium transition-all',
                  'bg-white text-slate-800 ring-1 ring-slate-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:ring-slate-300',
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                ].join(' ')}
              >
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-blue-50 text-blue-700">
                  {editing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                </span>
                {editing ? (loading ? 'Сохранение…' : 'Сохранить') : 'Редактировать'}
              </button>
            </div>
          </div>

          {/* РЕЖИМ РЕДАКТИРОВАНИЯ */}
          {editing ? (
            <div className="space-y-6 mt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Имя <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full h-11 px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Возраст</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full h-11 px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ВУЗ</label>
                  <input
                    type="text"
                    value={formData.university}
                    onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                    className="w-full h-11 px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Общежитие</label>
                  <input
                    type="text"
                    value={formData.dormitory}
                    onChange={(e) => setFormData({ ...formData, dormitory: e.target.value })}
                    className="w-full h-11 px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Комната</label>
                  <input
                    type="text"
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    className="w-full h-11 px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Пол</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full h-11 px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Не указан</option>
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">О себе</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              {/* Интересы */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-4">Интересы</label>

                {Object.entries(categories).map(([key, { name }]) => {
                  const categoryInterests = interests.filter(i => i.category === key);
                  if (categoryInterests.length === 0) return null;

                  return (
                    <div key={key} className="mb-6">
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">{name}</h3>
                      <div className="flex flex-wrap gap-2">
                        {categoryInterests.map(interest => {
                          const isSelected = selectedInterests.includes(interest.id);
                          const classes = isSelected
                            ? categoryClasses[key]?.selected || categoryClasses.other.selected
                            : categoryClasses[key]?.base || categoryClasses.other.base;
                          return (
                            <button
                              key={interest.id}
                              type="button"
                              onClick={() => toggleInterest(interest.id)}
                              className={`px-4 py-2 rounded-xl border-2 transition-all ${classes}`}
                            >
                              {interest.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // РЕЖИМ ПРОСМОТРА
            <div className="space-y-8 mt-8">
              <div className="anim-fadeup">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">О себе</h2>
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-slate-700 leading-relaxed ring-1 ring-slate-100">
                  {profile.bio || 'Информация не указана'}
                </p>
              </div>

              {userInterestNames.length > 0 && (
                <div className="anim-fadeup anim-d1">
                  <h2 className="text-lg font-semibold text-slate-900 mb-3">Интересы</h2>
                  <div className="flex flex-wrap gap-2">
                    {userInterestNames.map((interest, idx) => (
                      <span
                        key={idx}
                        className="select-none rounded-full border border-slate-200 bg-blue-50/60 px-3 py-1 text-sm text-blue-700 transition-all hover:-translate-y-0.5 hover:bg-blue-50"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Дополнительные карточки, чтобы страница не выглядела пусто (можно удалить в любой момент) */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="anim-fadeup rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm">
            <div className="mb-2 text-slate-900 font-semibold">Активность профиля</div>
            <p className="text-sm text-slate-600">
              Заполни больше информации о себе — это увеличит шансы найти подходящих соседей.
            </p>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                style={{ width: `${Math.min(100, 20 + ((profile?.interests?.length || 0) * 20))}%` }}
              />
            </div>
          </div>

          <div className="anim-fadeup rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm">
            <div className="mb-2 text-slate-900 font-semibold">Подсказка</div>
            <p className="text-sm text-slate-600">
            Укажи точное общежитие и интересы — твой профиль станет заметнее.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
