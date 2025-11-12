import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, ArrowLeft, Search, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useTypingIndicator } from '../hooks/useTypingIndicator';
import { formatMessageTime, formatLastSeen, getDateSeparator, groupMessagesByDate, truncateText } from '../lib/messageUtils';

type ConversationWithUser = {
  id: string;
  user: {
    id: string;
    full_name: string;
    is_online: boolean;
    last_seen: string;
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
  const [conversations, setConversations] = useState<ConversationWithUser[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const PAGE_SIZE = 50;

  useOnlineStatus(user?.id);

  const { isOtherUserTyping, setTyping } = useTypingIndicator(selectedConversation, user?.id);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
  if (!selectedConversation || !user) return;

  loadMessages(true);
  markMessagesAsRead();

  // один канал для сообщений
  const messagesChannel = supabase
    .channel(`messages:${selectedConversation}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConversation}` },
      (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => [...prev, newMsg]);
        if (newMsg.sender_id !== user.id) markMessagesAsRead();
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConversation}` },
      (payload) => {
        const updatedMsg = payload.new as Message;
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
        );
      }
    )
    .subscribe((status) => {
      console.log('🟢 Messages Realtime:', status);
    });

  // второй канал — обновления списка диалогов
  const convChannel = supabase
    .channel('realtime:conversations')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'conversations' },
      () => loadConversations()
    )
    .subscribe((status) => {
      console.log('🟢 Conversations Realtime:', status);
    });

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
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, is_online, last_seen')
              .eq('id', otherUserId)
              .single();

            const { data: lastMsg } = await supabase
              .from('messages')
              .select('content')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const unreadCount = conv.user1_id === user.id
              ? conv.unread_count_user1 || 0
              : conv.unread_count_user2 || 0;

            return {
              id: conv.id,
              user: profile!,
              last_message_at: conv.last_message_at,
              lastMessage: lastMsg?.content,
              unreadCount
            };
          })
        );

        setConversations(conversationsWithUsers);
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

        if (beforeMsg) {
          query = query.lt('created_at', beforeMsg.created_at);
        }
      }

      const { data } = await query;

      if (data) {
        const sortedData = [...data].reverse();

        if (initial) {
          setMessages(sortedData);
        } else {
          setMessages(prev => [...sortedData, ...prev]);
        }

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
        p_user_id: user.id
      });

      setConversations(prev => prev.map(conv =>
        conv.id === selectedConversation ? { ...conv, unreadCount: 0 } : conv
      ));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current || loadingMore || !hasMore) return;

    const { scrollTop } = messagesContainerRef.current;

    if (scrollTop < 100 && messages.length > 0) {
      const firstMessageId = messages[0].id;
      loadMessages(false, firstMessageId);
    }
  }, [loadingMore, hasMore, messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConversation || !newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setTyping(false);

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConversation,
        sender_id: user.id,
        content: messageContent
      });

    if (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (e.target.value.trim()) {
      setTyping(true);
    } else {
      setTyping(false);
    }
  };

  const selectedConvData = conversations.find(c => c.id === selectedConversation);

  const filteredConversations = searchQuery
    ? conversations.filter(conv =>
        conv.user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const messageGroups = groupMessagesByDate(messages);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex">
      <div className={`${selectedConversation ? 'hidden md:block' : 'block'} w-full md:w-96 bg-white border-r border-gray-200 flex flex-col`}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Сообщения</h2>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Поиск диалогов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {filteredConversations.length === 0 && !searchQuery ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Нет диалогов</p>
              <button
                onClick={() => onNavigate('search')}
                className="mt-4 text-blue-600 hover:text-blue-700"
              >
                Найти собеседника
              </button>
            </div>
          ) : filteredConversations.length === 0 && searchQuery ? (
            <div className="p-8 text-center text-gray-500">
              <p>Диалоги не найдены</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation === conv.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="font-semibold text-gray-900 truncate">{conv.user.full_name}</span>
                    {conv.user.is_online && (
                      <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                    )}
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0">
                      {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  {conv.lastMessage && (
                    <p className="text-sm text-gray-600 truncate flex-1">
                      {truncateText(conv.lastMessage, 50)}
                    </p>
                  )}
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                    {formatMessageTime(conv.last_message_at)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedConversation && selectedConvData ? (
          <>
            <div className="bg-white border-b border-gray-200 p-4 flex items-center">
              <button
                onClick={() => setSelectedConversation(null)}
                className="md:hidden mr-3 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedConvData.user.full_name}</h3>
                {selectedConvData.user.is_online ? (
                  <p className="text-sm text-green-600">В сети</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Был(а) {formatLastSeen(selectedConvData.user.last_seen)}
                  </p>
                )}
              </div>
            </div>

            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
            >
              {loadingMore && (
                <div className="text-center py-2">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                </div>
              )}

              {messageGroups.map((group, groupIndex) => (
                <div key={groupIndex}>
                  <div className="flex justify-center my-4">
                    <span className="px-3 py-1 bg-white rounded-full text-xs text-gray-500 shadow-sm">
                      {getDateSeparator(group.date)}
                    </span>
                  </div>

                  {group.messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}
                      >
                        <div
                          className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${
                            isOwn
                              ? 'bg-blue-600 text-white rounded-br-md'
                              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <div className={`flex items-center justify-end gap-1 text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString('ru', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {isOwn && msg.is_read && (
                              <span className="text-xs">✓✓</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {isOtherUserTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder="Написать сообщение..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Выберите диалог, чтобы начать общение</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
