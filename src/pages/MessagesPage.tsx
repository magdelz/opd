import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, ArrowLeft, Search, MessageCircle, Phone, Ban, Smile } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { useTypingIndicator } from '../hooks/useTypingIndicator';
import { formatMessageTime, formatLastSeen, getDateSeparator, groupMessagesByDate, truncateText } from '../lib/messageUtils';
import { filterContent, containsNSFW } from '../lib/contentFilter';
import { banUser, isBanned } from '../lib/banManager';
import { StickerPicker, isStickerMessage } from '../components/StickerPicker';
import { VoiceRecorder, VoicePlayer } from '../components/VoiceRecorder';
import { CallModal } from '../components/CallModal';

import type {
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
} from '@supabase/supabase-js';

type ConversationWithUser = {
  id: string;
  user: {
    id: string;
    full_name: string;
    is_online: boolean;
    last_seen: string;
    avatar_url: string | null;
  };
  last_message_at: string;
  lastMessage?: string;
  unreadCount: number;
};

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
};

type MessagesPageProps = {
  onNavigate: (page: string) => void;
};

export function MessagesPage({ onNavigate }: MessagesPageProps) {
  const { user } = useAuth();
  const { t } = useLang();
  const [conversations, setConversations] = useState<ConversationWithUser[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showStickers, setShowStickers] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [nsfwWarning, setNsfwWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const PAGE_SIZE = 50;

  const { isOtherUserTyping, setTyping } = useTypingIndicator(selectedConversation, user?.id);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  useEffect(() => {
    if (!selectedConversation || !user) return;

    loadMessages(true);
    markMessagesAsRead();

    const messagesChannel = supabase
      .channel(`messages:${selectedConversation}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${selectedConversation}`,
      }, (payload: RealtimePostgresInsertPayload<Message>) => {
        const newMsg = payload.new;
        // Deduplicate: don't add if already exists (e.g. optimistic update)
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          // Replace temp message if this is the real version
          const filtered = prev.filter(m => !m.id.startsWith('temp-'));
          return [...filtered, newMsg];
        });
        if (newMsg.sender_id !== user.id) {
          void markMessagesAsRead();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${selectedConversation}`,
      }, (payload: RealtimePostgresUpdatePayload<Message>) => {
        const updatedMsg = payload.new;
        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
      })
      .subscribe();

    const convChannel = supabase
      .channel('realtime:conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        void loadConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(convChannel);
      setTyping(false);
    };
  }, [selectedConversation, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (data) {
        const conversationsWithUsers = await Promise.all(
          data.map(async (conv) => {
            const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

            // Skip banned users
            if (isBanned(otherUserId)) return null;

            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, is_online, last_seen, avatar_url')
              .eq('id', otherUserId)
              .single();

            if (!profile) return null;

            const { data: lastMsg } = await supabase
              .from('messages')
              .select('content')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const unreadCount =
              conv.user1_id === user.id ? conv.unread_count_user1 || 0 : conv.unread_count_user2 || 0;

            return {
              id: conv.id,
              user: profile,
              last_message_at: conv.last_message_at,
              lastMessage: lastMsg?.content,
              unreadCount,
            } as ConversationWithUser;
          })
        );

        setConversations(conversationsWithUsers.filter(Boolean) as ConversationWithUser[]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (initial = false, beforeMessageId?: string) => {
    if (!selectedConversation) return;
    if (!initial) setLoadingMore(true);

    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (beforeMessageId) {
        const { data: beforeMsg } = await supabase
          .from('messages')
          .select('created_at')
          .eq('id', beforeMessageId)
          .single();
        if (beforeMsg) query = query.lt('created_at', beforeMsg.created_at);
      }

      const { data } = await query;
      if (data) {
        const sortedData = [...data].reverse();
        if (initial) setMessages(sortedData);
        else setMessages(prev => [...sortedData, ...prev]);
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!selectedConversation || !user) return;
    try {
      await supabase.rpc('mark_messages_as_read', {
        p_conversation_id: selectedConversation,
        p_user_id: user.id,
      });
      setConversations(prev =>
        prev.map(conv => conv.id === selectedConversation ? { ...conv, unreadCount: 0 } : conv)
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current || loadingMore || !hasMore) return;
    const { scrollTop } = messagesContainerRef.current;
    if (scrollTop < 100 && messages.length > 0) {
      const firstMessageId = messages[0].id;
      void loadMessages(false, firstMessageId);
    }
  }, [loadingMore, hasMore, messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConversation || !newMessage.trim()) return;

    // Content filter
    if (containsNSFW(newMessage)) {
      setNsfwWarning(true);
      setTimeout(() => setNsfwWarning(false), 3000);
    }
    const { clean } = filterContent(newMessage);

    const messageContent = clean.trim();
    if (!messageContent) return;

    setNewMessage('');
    setTyping(false);

    // Optimistic update — add message immediately
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      sender_id: user.id,
      content: messageContent,
      created_at: new Date().toISOString(),
      is_read: false,
      read_at: null,
    };
    setMessages(prev => [...prev, tempMsg]);

    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConversation,
      sender_id: user.id,
      content: messageContent,
    });

    if (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(messageContent);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) setTyping(true);
    else setTyping(false);
  };

  const handleStickerSelect = (sticker: string) => {
    setNewMessage(prev => prev + sticker);
    inputRef.current?.focus();
  };

  const handleVoiceSend = (audioUrl: string, duration: number) => {
    if (!user || !selectedConversation) return;
    const voiceMsg = `🎤 ${t('msg.voice_msg')} (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`;

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      sender_id: user.id,
      content: voiceMsg,
      created_at: new Date().toISOString(),
      is_read: false,
      read_at: null,
    };
    setMessages(prev => [...prev, tempMsg]);

    supabase.from('messages').insert({
      conversation_id: selectedConversation,
      sender_id: user.id,
      content: voiceMsg,
    });
  };

  const handleBanUser = (userId: string) => {
    if (confirm(t('misc.confirm_ban'))) {
      banUser(userId);
      setSelectedConversation(null);
      loadConversations();
    }
  };

  const selectedConvData = conversations.find(c => c.id === selectedConversation);

  const filteredConversations = searchQuery
    ? conversations.filter(conv => conv.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  const messageGroups = groupMessagesByDate(messages);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">{t('misc.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex">
      {/* Conversations list */}
      <div className={`${selectedConversation ? 'hidden md:block' : 'block'} w-full md:w-96 bg-white border-r border-slate-200 flex flex-col`}>
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-4">{t('msg.title')}</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('msg.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {filteredConversations.length === 0 && !searchQuery ? (
            <div className="p-8 text-center text-slate-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>{t('msg.no_chats')}</p>
              <button onClick={() => onNavigate('search')} className="mt-4 text-blue-600 hover:text-blue-700 font-medium">
                {t('msg.find')}
              </button>
            </div>
          ) : filteredConversations.length === 0 && searchQuery ? (
            <div className="p-8 text-center text-slate-500">
              <p>{t('msg.not_found')}</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                  selectedConversation === conv.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="font-semibold text-slate-900 truncate">{conv.user.full_name}</span>
                    {conv.user.is_online && <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>}
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 shadow-sm">
                      {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  {conv.lastMessage && <p className="text-sm text-slate-600 truncate flex-1">{truncateText(conv.lastMessage, 50)}</p>}
                  <span className="text-xs text-slate-400 ml-2 flex-shrink-0">{formatMessageTime(conv.last_message_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation && selectedConvData ? (
          <>
            {/* Chat header */}
            <div className="glass border-b border-slate-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedConversation(null)} className="md:hidden mr-1 text-slate-600 hover:text-slate-900">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                  <h3 className="font-semibold text-slate-900">{selectedConvData.user.full_name}</h3>
                  {selectedConvData.user.is_online ? (
                    <p className="text-sm text-green-600">{t('msg.online')}</p>
                  ) : (
                    <p className="text-sm text-slate-500">{t('msg.was_online')} {formatLastSeen(selectedConvData.user.last_seen)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowCall(true)}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title={t('msg.call')}
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleBanUser(selectedConvData.user.id)}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('search.ban')}
                >
                  <Ban className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {loadingMore && (
                <div className="text-center py-2">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                </div>
              )}

              {messageGroups.map((group, groupIndex) => (
                <div key={groupIndex}>
                  <div className="flex justify-center my-4">
                    <span className="px-3 py-1 bg-white rounded-full text-xs text-slate-500 shadow-sm">{getDateSeparator(group.date)}</span>
                  </div>

                  {group.messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id;
                    const isSticker = isStickerMessage(msg.content);

                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
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
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            <div className={`flex items-center justify-end gap-1 text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-slate-400'}`}>
                              <span>
                                {new Date(msg.created_at).toLocaleTimeString('ru', {
                                  hour: '2-digit', minute: '2-digit',
                                })}
                              </span>
                              {isOwn && msg.is_read && <span className="text-xs">✓✓</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {isOtherUserTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* NSFW warning */}
            {nsfwWarning && (
              <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 text-amber-700 text-sm text-center">
                {t('msg.nsfw_warning')}
              </div>
            )}

            {/* Input area */}
            <form onSubmit={sendMessage} className="bg-white border-t border-slate-200 p-4">
              <div className="flex items-center gap-2">
                {/* Sticker button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowStickers(!showStickers)}
                    className="p-2 text-slate-500 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                    title={t('stickers.title')}
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                  {showStickers && (
                    <StickerPicker
                      onSelect={handleStickerSelect}
                      onClose={() => setShowStickers(false)}
                    />
                  )}
                </div>

                {/* Voice recorder */}
                <VoiceRecorder onSend={handleVoiceSend} />

                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder={t('msg.placeholder')}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Call modal */}
            {showCall && (
              <CallModal
                userName={selectedConvData.user.full_name}
                userInitial={selectedConvData.user.full_name.charAt(0).toUpperCase()}
                onClose={() => setShowCall(false)}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <div className="text-center text-slate-500">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg">{t('msg.select_chat')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
