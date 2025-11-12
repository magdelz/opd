import { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Plus, X } from 'lucide-react';
import { supabase, Event } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type EventWithDetails = Event & {
  creator: { full_name: string };
  participant_count: number;
  is_participant: boolean;
};

export function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    event_date: '',
    max_participants: ''
  });

  useEffect(() => {
    loadEvents();
  }, [user]);

  const loadEvents = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: eventsData } = await supabase
        .from('events')
        .select('*, profiles!events_creator_id_fkey(full_name)')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true });

      if (eventsData) {
        const eventsWithDetails = await Promise.all(
          eventsData.map(async (event) => {
            const { count } = await supabase
              .from('event_participants')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id);

            const { data: participation } = await supabase
              .from('event_participants')
              .select('id')
              .eq('event_id', event.id)
              .eq('user_id', user.id)
              .maybeSingle();

            return {
              ...event,
              creator: event.profiles,
              participant_count: count || 0,
              is_participant: !!participation
            };
          })
        );

        setEvents(eventsWithDetails as any);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase
      .from('events')
      .insert({
        creator_id: user.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        location: formData.location,
        event_date: formData.event_date,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null
      });

    if (!error) {
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        category: '',
        location: '',
        event_date: '',
        max_participants: ''
      });
      loadEvents();
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('event_participants')
      .insert({
        event_id: eventId,
        user_id: user.id
      });

    if (!error) {
      loadEvents();
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user.id);

    if (!error) {
      loadEvents();
    }
  };

  const categories = [
    { value: 'sport', label: 'Спорт', color: 'blue' },
    { value: 'games', label: 'Игры', color: 'green' },
    { value: 'study', label: 'Учёба', color: 'purple' },
    { value: 'hobby', label: 'Хобби', color: 'orange' },
    { value: 'other', label: 'Другое', color: 'pink' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">События</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Создать событие
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Загрузка...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const category = categories.find(c => c.value === event.category);
              return (
                <div
                  key={event.id}
                  className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className={`h-2 bg-${category?.color || 'gray'}-500`}></div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-900 flex-1">{event.title}</h3>
                      <span className={`px-3 py-1 bg-${category?.color || 'gray'}-100 text-${category?.color || 'gray'}-700 text-xs rounded-full`}>
                        {category?.label}
                      </span>
                    </div>

                    <p className="text-gray-700 text-sm mb-4 line-clamp-2">{event.description}</p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(event.event_date).toLocaleString('ru', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>

                      {event.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-2" />
                          {event.location}
                        </div>
                      )}

                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        {event.participant_count}
                        {event.max_participants && ` / ${event.max_participants}`} участников
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 mb-4">
                      Организатор: {event.creator.full_name}
                    </p>

                    {event.is_participant ? (
                      <button
                        onClick={() => handleLeaveEvent(event.id)}
                        className="w-full py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Отменить участие
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinEvent(event.id)}
                        disabled={event.max_participants ? event.participant_count >= event.max_participants : false}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {event.max_participants && event.participant_count >= event.max_participants
                          ? 'Мест нет'
                          : 'Присоединиться'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-4">Нет предстоящих событий</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-600 hover:text-blue-700"
            >
              Создай первое событие
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Новое событие</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Пробежка по утрам"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Расскажи подробнее о событии..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Категория <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Выбери категорию</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Место
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Спортзал, комната 412..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата и время <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Максимум участников
                  </label>
                  <input
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Без ограничений"
                    min="1"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Создать событие
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
