import { useState, useEffect } from 'react';
import { Edit2, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { supabase, Interest } from '../lib/supabase';
import { AvatarPicker } from '../components/AvatarPicker';
import { Avatar } from '../components/Avatar';
import { AutocompleteInput } from '../components/AutocompleteInput';
import { UNIVERSITIES_LIST, DORMITORIES_LIST } from '../lib/constants';

type ProfilePageProps = {
  onNavigate: (page: string) => void;
};

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [userInterestNames, setUserInterestNames] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [formData, setFormData] = useState({
    full_name: '', age: '', university: '', dormitory: '', room_number: '', bio: '', gender: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '', age: profile.age?.toString() || '',
        university: profile.university || '', dormitory: profile.dormitory || '',
        room_number: profile.room_number || '', bio: profile.bio || '', gender: profile.gender || ''
      });
      loadUserInterests();
    }
    loadInterests();
  }, [profile]);

  const loadInterests = async () => {
    const { data } = await supabase.from('interests').select('*').order('category', { ascending: true });
    if (data) setInterests(data);
  };

  const loadUserInterests = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_interests').select('interest_id, interests(id, name)').eq('user_id', user.id);
    if (data) {
      setSelectedInterests(data.map((ui: any) => ui.interests.id));
      setUserInterestNames(data.map((ui: any) => ui.interests.name));
    }
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => prev.includes(interestId) ? prev.filter(id => id !== interestId) : [...prev, interestId]);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error: profileError } = await supabase.from('profiles').update({
        full_name: formData.full_name, age: formData.age ? parseInt(formData.age) : null,
        university: formData.university, dormitory: formData.dormitory,
        room_number: formData.room_number, bio: formData.bio, gender: formData.gender,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
      if (profileError) throw profileError;

      await supabase.from('user_interests').delete().eq('user_id', user.id);

      let finalInterests = [...selectedInterests];
      
      if (customInterest.trim()) {
        const existing = interests.find(i => i.name.toLowerCase() === customInterest.trim().toLowerCase());
        if (existing) {
          if (!finalInterests.includes(existing.id)) finalInterests.push(existing.id);
        } else {
          const { data: newInterest } = await supabase.from('interests').insert({
            name: customInterest.trim(),
            category: 'other',
            icon: '✨'
          }).select().single();
          if (newInterest) {
            finalInterests.push(newInterest.id);
          }
        }
      }

      if (finalInterests.length > 0) {
        const userInterests = finalInterests.map(interestId => ({ user_id: user.id, interest_id: interestId }));
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

  const handleAvatarChange = async (avatarValue: string) => {
    if (!user) return;
    await supabase.from('profiles').update({ avatar_url: avatarValue }).eq('id', user.id);
    await refreshProfile();
  };

  const categoryClasses: Record<string, { selected: string; base: string }> = {
    sport: { selected: 'bg-blue-100 border-blue-500 text-blue-700', base: 'bg-white border-slate-300 text-slate-700 hover:border-slate-400' },
    games: { selected: 'bg-green-100 border-green-500 text-green-700', base: 'bg-white border-slate-300 text-slate-700 hover:border-slate-400' },
    study: { selected: 'bg-purple-100 border-purple-500 text-purple-700', base: 'bg-white border-slate-300 text-slate-700 hover:border-slate-400' },
    hobby: { selected: 'bg-orange-100 border-orange-500 text-orange-700', base: 'bg-white border-slate-300 text-slate-700 hover:border-slate-400' },
    other: { selected: 'bg-pink-100 border-pink-500 text-pink-700', base: 'bg-white border-slate-300 text-slate-700 hover:border-slate-400' },
  };

  const categories: Record<string, { name: string }> = {
    sport: { name: t('cat.sport') }, games: { name: t('cat.games') },
    study: { name: t('cat.study') }, hobby: { name: t('cat.hobby') }, other: { name: t('cat.other') },
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center animate-slide-up">
          <p className="text-slate-600 mb-4">{t('profile.create_text')}</p>
          <button
            onClick={() => onNavigate('setup-profile')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md font-medium"
          >
            {t('profile.create')}
          </button>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        @keyframes fadeUp { from {opacity:0; transform: translateY(12px)} to {opacity:1; transform: translateY(0)} }
        @keyframes pulseGrad { 0%{transform:scale(1)} 50%{transform:scale(1.015)} 100%{transform:scale(1)} }
        .anim-fadeup { animation: fadeUp .35s ease-out both; }
      `}</style>

      {/* Cover */}
      <div className="relative overflow-hidden">
        <div className="h-40 md:h-48 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-gradient" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -left-20 h-44 w-44 rounded-full bg-blue-300/40 blur-3xl" />
          <div className="absolute -bottom-10 right-10 h-60 w-60 rounded-full bg-indigo-300/40 blur-3xl" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 -mt-16 pb-10">
        <div className="anim-fadeup rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5 md:p-7">
          <div className="flex flex-col md:flex-row md:items-end gap-5">
            {/* Avatar - clickable */}
            <div className="relative group cursor-pointer" onClick={() => setShowAvatarPicker(true)}>
              <div className="grid h-28 w-28 place-items-center rounded-full bg-white shadow-lg ring-4 ring-white">
                <Avatar url={profile.avatar_url} altText={profile.full_name} size="xxl" />
              </div>
              {/* Overlay */}
              <div className="absolute inset-0 grid place-items-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-medium">{t('profile.change_avatar')}</span>
              </div>
            </div>

            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                {profile.full_name || 'Имя не указано'}
                {profile.age ? <span className="text-slate-500 font-medium">, {profile.age}</span> : null}
              </h1>
              <div className="mt-3 grid gap-2 text-slate-700 text-sm md:text-[15px]">
                {profile.university && <div>{profile.university}</div>}
                {profile.dormitory && <div>{profile.dormitory}{profile.room_number && `, ${t('setup.room').toLowerCase()} ${profile.room_number}`}</div>}
              </div>
            </div>

            <div className="md:self-start">
              <button
                onClick={() => editing ? handleSave() : setEditing(true)}
                disabled={loading}
                className="group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[15px] font-medium transition-all bg-white text-slate-800 ring-1 ring-slate-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:ring-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-blue-50 text-blue-700">
                  {editing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                </span>
                {editing ? (loading ? t('profile.saving') : t('profile.save')) : t('profile.edit')}
              </button>
            </div>
          </div>

          {/* Edit mode */}
          {editing ? (
            <div className="space-y-6 mt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('setup.name')} <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full h-11 px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('setup.age')}</label>
                  <input type="number" value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full h-11 px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('setup.university')}</label>
                  <AutocompleteInput 
                    value={formData.university} 
                    onChange={(val) => setFormData({ ...formData, university: val })}
                    suggestions={UNIVERSITIES_LIST}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('setup.dormitory')}</label>
                  <AutocompleteInput 
                    value={formData.dormitory} 
                    onChange={(val) => setFormData({ ...formData, dormitory: val })}
                    suggestions={DORMITORIES_LIST}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('setup.room')}</label>
                  <input type="text" value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    className="w-full h-11 px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('setup.gender')}</label>
                  <select value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full h-11 px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200">
                    <option value="">{t('setup.gender_none')}</option>
                    <option value="male">{t('setup.gender_male')}</option>
                    <option value="female">{t('setup.gender_female')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('setup.bio')}</label>
                <textarea value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-4">{t('profile.interests')}</label>
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
                            <button key={interest.id} type="button" onClick={() => toggleInterest(interest.id)}
                              className={`px-4 py-2 rounded-xl border-2 transition-all ${classes}`}>
                              {interest.name}
                            </button>
                          );
                        })}
                      </div>
                      {key === 'other' && (
                        <div className="mt-4">
                          <input 
                            type="text" 
                            value={customInterest} 
                            onChange={(e) => setCustomInterest(e.target.value)} 
                            placeholder="Впишите свой интерес (если нет в списке)"
                            className="w-full sm:w-2/3 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none transition-shadow text-sm"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-8 mt-8">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">{t('profile.about')}</h2>
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-slate-700 leading-relaxed ring-1 ring-slate-100">
                  {profile.bio || t('profile.no_info')}
                </p>
              </div>

              {userInterestNames.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-3">{t('profile.interests')}</h2>
                  <div className="flex flex-wrap gap-2">
                    {userInterestNames.map((interest, idx) => (
                      <span key={idx}
                        className="select-none rounded-full border border-slate-200 bg-blue-50/60 px-3 py-1 text-sm text-blue-700 transition-all hover:-translate-y-0.5 hover:bg-blue-50">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="anim-fadeup rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm card-accent">
            <div className="mb-2 text-slate-900 font-semibold">{t('profile.activity')}</div>
            <p className="text-sm text-slate-600">{t('profile.activity_text')}</p>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                style={{ width: `${Math.min(100, 20 + (userInterestNames.length * 15))}%` }} />
            </div>
          </div>
          <div className="anim-fadeup rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm card-accent">
            <div className="mb-2 text-slate-900 font-semibold">{t('profile.hint')}</div>
            <p className="text-sm text-slate-600">{t('profile.hint_text')}</p>
          </div>
        </div>
      </div>

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <AvatarPicker
          currentAvatar={profile.avatar_url}
          onSelect={handleAvatarChange}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </div>
  );
}
