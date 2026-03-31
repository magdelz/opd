import { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Plus, X } from 'lucide-react';
import { supabase, Event } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { getHiddenCategories } from '../lib/banManager';

type EventWithDetails = Event & {
  creator: { full_name: string };
  participant_count: number;
  is_participant: boolean;
};

type EventsPageProps = {
  onNavigate: (page: string) => void;
};

const CATEGORY_COLORS: Record<string, { bar: string; badge: string }> = {
  sport: { bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
  games: { bar: 'bg-green-500', badge: 'bg-green-100 text-green-700' },
  study: { bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700' },
  hobby: { bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700' },
  other: { bar: 'bg-pink-500', badge: 'bg-pink-100 text-pink-700' },
};

export function EventsPage({ onNavigate }: EventsPageProps) {
  const { user } = useAuth();
  const { t } = useLang();
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', category: '', location: '', event_date: '', max_participants: ''
  });

  const categories = [
    { value: 'sport', label: t('cat.sport') },
    { value: 'games', label: t('cat.games') },
    { value: 'study', label: t('cat.study') },
    { value: 'hobby', label: t('cat.hobby') },
    { value: 'other', label: t('cat.other') },
  ];

  useEffect(() => { loadEvents(); }, [user]);

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
        const hiddenCats = getHiddenCategories();
        const eventsWithDetails = await Promise.all(
          eventsData
            .filter((event: any) => !hiddenCats.includes(event.category))
            .map(async (event: any) => {
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
    const { error } = await supabase.from('events').insert({
      creator_id: user.id, title: formData.title, description: formData.description,
      category: formData.category, location: formData.location, event_date: formData.event_date,
      max_participants: formData.max_participants ? parseInt(formData.max_participants) : null
    });
    if (!error) {
      setShowCreateModal(false);
      setFormData({ title: '', description: '', category: '', location: '', event_date: '', max_participants: '' });
      loadEvents();
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    if (!user) return;
    const { error } = await supabase.from('event_participants').insert({ event_id: eventId, user_id: user.id });
    if (!error) loadEvents();
  };

  const handleLeaveEvent = async (eventId: string) => {
    if (!user) return;
    const { error } = await supabase.from('event_participants').delete().eq('event_id', eventId).eq('user_id', user.id);
    if (!error) loadEvents();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900">{t('events.title')}</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md font-medium"
          >
            <Plus className="w-5 h-5" /> {t('events.create')}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">{t('misc.loading')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => {
              const colors = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other;
              const category = categories.find(c => c.value === event.category);
              return (
                <div key={event.id} className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all card-accent">
                  <div className={`h-2 ${colors.bar}`}></div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-slate-900 flex-1">{event.title}</h3>
                      <span className={`px-3 py-1 ${colors.badge} text-xs rounded-full font-medium`}>
                        {category?.label}
                      </span>
                    </div>
                    <p className="text-slate-700 text-sm mb-4 line-clamp-2">{event.description}</p>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-slate-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(event.event_date).toLocaleString('ru', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {event.location && (
                        <div className="flex items-center text-sm text-slate-600">
                          <MapPin className="w-4 h-4 mr-2" /> {event.location}
                        </div>
                      )}
                      <div className="flex items-center text-sm text-slate-600">
                        <Users className="w-4 h-4 mr-2" /> {event.participant_count}
                        {event.max_participants && ` / ${event.max_participants}`} {t('events.participants')}
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">{t('events.organizer')}: {event.creator.full_name}</p>
                    {event.is_participant ? (
                      <button onClick={() => handleLeaveEvent(event.id)}
                        className="w-full py-2 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition-colors font-medium">
                        {t('events.leave')}
                      </button>
                    ) : (
                      <button onClick={() => handleJoinEvent(event.id)}
                        disabled={event.max_participants ? event.participant_count >= event.max_participants : false}
                        className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm">
                        {event.max_participants && event.participant_count >= event.max_participants ? t('events.full') : t('events.join')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl card-accent">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg mb-4">{t('events.no_events')}</p>
            <button onClick={() => setShowCreateModal(true)} className="text-blue-600 hover:text-blue-700 font-medium">
              {t('events.create_first')}
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">{t('events.new')}</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('events.name')} <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('events.desc')}</label>
                  <textarea value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('events.category')} <span className="text-red-500">*</span></label>
                  <select required value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-200">
                    <option value="">{t('events.select_cat')}</option>
                    {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('events.location')}</label>
                  <input type="text" value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('events.date')} <span className="text-red-500">*</span></label>
                  <input type="datetime-local" required value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('events.max')}</label>
                  <input type="number" value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-200" min="1" />
                </div>
                <button type="submit"
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md">
                  {t('events.create')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
