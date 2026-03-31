import { useState, useEffect, useRef } from 'react';
import { Plus, X, Send, Users, ArrowLeft, Phone, Video } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';

import { filterContent } from '../lib/contentFilter';
import { CallModal } from '../components/CallModal';
import { StickerPicker, isStickerMessage } from '../components/StickerPicker';
import { Smile } from 'lucide-react';

type Group = {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  avatar_url: string | null;
  created_at: string;
  member_count: number;
  is_member: boolean;
};

type GroupMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name: string;
};

type GroupsPageProps = {
  onNavigate: (page: string) => void;
};

export function GroupsPage({ onNavigate }: GroupsPageProps) {
  const { user } = useAuth();
  const { t } = useLang();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [showCall, setShowCall] = useState(false);
  const [callIsVideo, setCallIsVideo] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadGroups();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!selectedGroup) return;
    loadGroupMessages(selectedGroup);

    const channel = supabase
      .channel(`group_messages:${selectedGroup}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${selectedGroup}`,
      }, async (payload: any) => {
        const msg = payload.new;
        const { data: sender } = await supabase.from('profiles').select('full_name').eq('id', msg.sender_id).single();
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, { ...msg, sender_name: sender?.full_name || '?' }];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedGroup]);

  const loadGroups = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: groupsData } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
      if (!groupsData) { setLoading(false); return; }

      const enriched = await Promise.all(
        groupsData.map(async (g: any) => {
          const { count } = await supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', g.id);
          const { data: membership } = await supabase.from('group_members').select('id').eq('group_id', g.id).eq('user_id', user.id).maybeSingle();
          return { ...g, member_count: count || 0, is_member: !!membership } as Group;
        })
      );
      setGroups(enriched);
    } catch (e) {
      console.error('Error loading groups:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMessages = async (groupId: string) => {
    const { data } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) {
      const enriched = await Promise.all(
        data.map(async (m: any) => {
          const { data: sender } = await supabase.from('profiles').select('full_name').eq('id', m.sender_id).single();
          return { ...m, sender_name: sender?.full_name || '?' } as GroupMessage;
        })
      );
      setMessages(enriched);
    }
  };

  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim()) return;
    const { data, error } = await supabase.from('groups').insert({
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || null,
      creator_id: user.id,
    }).select().single();

    if (!error && data) {
      await supabase.from('group_members').insert({ group_id: data.id, user_id: user.id, role: 'admin' });
      setNewGroupName('');
      setNewGroupDesc('');
      setShowCreate(false);
      loadGroups();
    }
  };

  const handleJoin = async (groupId: string) => {
    if (!user) return;
    await supabase.from('group_members').insert({ group_id: groupId, user_id: user.id });
    loadGroups();
  };

  const handleLeave = async (groupId: string) => {
    if (!user) return;
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user.id);
    if (selectedGroup === groupId) setSelectedGroup(null);
    loadGroups();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedGroup || !newMessage.trim()) return;
    const { clean } = filterContent(newMessage);
    setNewMessage('');

    // Optimistic
    const tempMsg: GroupMessage = {
      id: `temp-${Date.now()}`,
      group_id: selectedGroup,
      sender_id: user.id,
      content: clean,
      created_at: new Date().toISOString(),
      sender_name: 'Вы',
    };
    setMessages(prev => [...prev, tempMsg]);

    await supabase.from('group_messages').insert({
      group_id: selectedGroup,
      sender_id: user.id,
      content: clean,
    });
  };

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="flex h-[calc(100vh-64px)]">
        {/* Groups list */}
        <div className={`${selectedGroup ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-slate-200 bg-white`}>
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-slate-900">{t('groups.title')}</h2>
              <button
                onClick={() => setShowCreate(true)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400">{t('misc.loading')}</div>
            ) : groups.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">{t('groups.no_groups')}</p>
                <button onClick={() => setShowCreate(true)} className="mt-3 text-blue-600 hover:text-blue-700 font-medium">
                  {t('groups.create_first')}
                </button>
              </div>
            ) : (
              groups.map(group => (
                <div
                  key={group.id}
                  className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedGroup === group.id ? 'bg-blue-50' : ''}`}
                  onClick={() => group.is_member && setSelectedGroup(group.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{group.name}</h3>
                      <p className="text-xs text-slate-400">{group.member_count} {t('groups.members')}</p>
                    </div>
                    {!group.is_member ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleJoin(group.id); }}
                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        {t('groups.join')}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleLeave(group.id); }}
                        className="px-3 py-1 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        {t('groups.leave')}
                      </button>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-xs text-slate-500 mt-1 truncate">{group.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Group chat */}
        <div className="flex-1 flex flex-col">
          {selectedGroup && selectedGroupData ? (
            <>
              <div className="bg-white border-b border-slate-200 p-4 flex items-center gap-3">
                 <div className="flex flex-1 items-center gap-3">
                  <button onClick={() => setSelectedGroup(null)} className="md:hidden text-slate-600 hover:text-slate-900">
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {selectedGroupData.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <h3 className="font-semibold text-slate-900 truncate">{selectedGroupData.name}</h3>
                    <p className="text-xs text-slate-400">{selectedGroupData.member_count} {t('groups.members')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => { setCallIsVideo(false); setShowCall(true); }}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => { setCallIsVideo(true); setShowCall(true); }}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors hidden sm:block"
                  >
                    <Video className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {messages.map(msg => {
                  const isOwn = msg.sender_id === user?.id;
                  const isSticker = isStickerMessage(msg.content);
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      {isSticker ? (
                        <div className="text-5xl px-2 py-1">
                          {msg.content}
                        </div>
                      ) : (
                        <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-br-md shadow-md'
                            : 'bg-white text-slate-900 border border-slate-200 rounded-bl-md shadow-sm'
                        }`}>
                          {!isOwn && <p className="text-xs font-semibold text-blue-600 mb-0.5">{msg.sender_name}</p>}
                          <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                          <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-slate-400'} text-right`}>
                            {new Date(msg.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="bg-white border-t border-slate-200 p-4">
                <div className="flex gap-2 relative items-end">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowStickers(!showStickers)}
                      className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                      title={t('msg.stickers')}
                    >
                      <Smile className="w-6 h-6" />
                    </button>
                    {showStickers && (
                      <StickerPicker
                        onSelect={(sticker) => setNewMessage(m => m + sticker)}
                        onClose={() => setShowStickers(false)}
                      />
                    )}
                  </div>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('msg.placeholder')}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center shadow-md"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
              <div className="text-center text-slate-500">
                <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-lg">{t('msg.select_chat')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">{t('groups.create')}</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('groups.name')} *</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  placeholder={t('groups.name')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('groups.desc')}</label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-300 resize-none"
                  rows={3}
                  placeholder={t('groups.desc')}
                />
              </div>
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim()}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md disabled:opacity-50"
              >
                {t('groups.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Modal */}
      {showCall && selectedGroupData && (
        <CallModal
          userName={selectedGroupData.name}
          userInitial={selectedGroupData.name.charAt(0).toUpperCase()}
          onClose={() => setShowCall(false)}
        />
      )}
    </div>
  );
}
