import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { supabase, Interest } from '../lib/supabase';
import { AutocompleteInput } from '../components/AutocompleteInput';
import { UNIVERSITIES_LIST, DORMITORIES_LIST } from '../lib/constants';

type SetupProfilePageProps = {
  onNavigate: (page: string) => void;
};

export function SetupProfilePage({ onNavigate }: SetupProfilePageProps) {
  const { user, refreshProfile } = useAuth();
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    full_name: '', age: '', university: '', dormitory: '', room_number: '', bio: '', gender: ''
  });
  const [customInterest, setCustomInterest] = useState('');

  useEffect(() => { loadInterests(); }, []);

  const loadInterests = async () => {
    const { data } = await supabase.from('interests').select('*').order('category', { ascending: true });
    if (data) setInterests(data);
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => prev.includes(interestId) ? prev.filter(id => id !== interestId) : [...prev, interestId]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id, full_name: formData.full_name, age: formData.age ? parseInt(formData.age) : null,
        university: formData.university, dormitory: formData.dormitory, room_number: formData.room_number,
        bio: formData.bio, gender: formData.gender, updated_at: new Date().toISOString()
      });
      if (profileError) throw profileError;

      let finalInterests = [...selectedInterests];
      
      if (customInterest.trim()) {
        const existing = interests.find(i => i.name.toLowerCase() === customInterest.trim().toLowerCase());
        if (existing) {
          if (!finalInterests.includes(existing.id)) finalInterests.push(existing.id);
        } else {
          const { data: newInterest, error: newIntErr } = await supabase.from('interests').insert({
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
        const { error: interestsError } = await supabase.from('user_interests').upsert(userInterests);
        if (interestsError) throw interestsError;
      }

      await refreshProfile();
      onNavigate('search');
    } catch (error) {
      console.error('Error creating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryMap: Record<string, { nameKey: string; style: string }> = {
    sport: { nameKey: 'cat.sport', style: 'bg-blue-100 border-blue-500 text-blue-700' },
    games: { nameKey: 'cat.games', style: 'bg-green-100 border-green-500 text-green-700' },
    study: { nameKey: 'cat.study', style: 'bg-purple-100 border-purple-500 text-purple-700' },
    hobby: { nameKey: 'cat.hobby', style: 'bg-orange-100 border-orange-500 text-orange-700' },
    other: { nameKey: 'cat.other', style: 'bg-pink-100 border-pink-500 text-pink-700' }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 animate-slide-up">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">{t('setup.title')}</h2>
          <p className="text-slate-600 mb-8">{t('setup.subtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('setup.name')} <span className="text-red-500">*</span></label>
                <input type="text" required value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('setup.age')}</label>
                <input type="number" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" min="16" max="100" />
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
                <input type="text" value={formData.room_number} onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('setup.gender')}</label>
                <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow bg-white">
                  <option value="">{t('setup.gender_none')}</option>
                  <option value="male">{t('setup.gender_male')}</option>
                  <option value="female">{t('setup.gender_female')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('setup.bio')}</label>
              <textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                placeholder={t('setup.bio_placeholder')} />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-4">{t('setup.interests')}</label>
              {Object.entries(categoryMap).map(([key, config]) => {
                const categoryInterests = interests.filter(i => i.category === key);
                if (categoryInterests.length === 0) return null;
                return (
                  <div key={key} className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">{t(config.nameKey)}</h3>
                    <div className="flex flex-wrap gap-2">
                      {categoryInterests.map(interest => (
                        <button key={interest.id} type="button" onClick={() => toggleInterest(interest.id)}
                          className={`px-4 py-2 rounded-xl border-2 transition-all font-medium ${
                            selectedInterests.includes(interest.id)
                              ? config.style
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}>
                          {interest.name}
                        </button>
                      ))}
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

            <button type="submit" disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md btn-glow disabled:opacity-50 disabled:cursor-not-allowed text-lg">
              {loading ? t('setup.saving') : t('setup.save')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
