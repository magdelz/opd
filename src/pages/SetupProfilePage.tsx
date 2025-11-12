import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Interest } from '../lib/supabase';

type SetupProfilePageProps = {
  onNavigate: (page: string) => void;
};

export function SetupProfilePage({ onNavigate }: SetupProfilePageProps) {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    university: '',
    dormitory: '',
    room_number: '',
    bio: '',
    gender: ''
  });

  useEffect(() => {
    loadInterests();
  }, []);

  const loadInterests = async () => {
    const { data } = await supabase
      .from('interests')
      .select('*')
      .order('category', { ascending: true });
    if (data) setInterests(data);
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.full_name,
          age: formData.age ? parseInt(formData.age) : null,
          university: formData.university,
          dormitory: formData.dormitory,
          room_number: formData.room_number,
          bio: formData.bio,
          gender: formData.gender,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      if (selectedInterests.length > 0) {
        const userInterests = selectedInterests.map(interestId => ({
          user_id: user.id,
          interest_id: interestId
        }));

        const { error: interestsError } = await supabase
          .from('user_interests')
          .upsert(userInterests);

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

  const categories = {
    sport: { name: 'Спорт', color: 'blue' },
    games: { name: 'Игры', color: 'green' },
    study: { name: 'Учёба', color: 'purple' },
    hobby: { name: 'Хобби', color: 'orange' },
    other: { name: 'Другое', color: 'pink' }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Создай свой профиль</h2>
          <p className="text-gray-600 mb-8">Расскажи о себе, чтобы найти соседей по интересам</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Имя <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Иван Иванов"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Возраст
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="20"
                  min="16"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ВУЗ
                </label>
                <input
                  type="text"
                  value={formData.university}
                  onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="МГУ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Общежитие
                </label>
                <input
                  type="text"
                  value={formData.dormitory}
                  onChange={(e) => setFormData({ ...formData, dormitory: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Общага №3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Комната
                </label>
                <input
                  type="text"
                  value={formData.room_number}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="412"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Пол
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Не указан</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                О себе
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Расскажи немного о себе, своих увлечениях и чем любишь заниматься..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-4">
                Выбери свои интересы
              </label>
              {Object.entries(categories).map(([key, { name, color }]) => {
                const categoryInterests = interests.filter(i => i.category === key);
                if (categoryInterests.length === 0) return null;

                return (
                  <div key={key} className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">{name}</h3>
                    <div className="flex flex-wrap gap-2">
                      {categoryInterests.map(interest => (
                        <button
                          key={interest.id}
                          type="button"
                          onClick={() => toggleInterest(interest.id)}
                          className={`px-4 py-2 rounded-lg border-2 transition-all ${
                            selectedInterests.includes(interest.id)
                              ? `bg-${color}-100 border-${color}-500 text-${color}-700`
                              : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {interest.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Сохранение...' : 'Создать профиль'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
