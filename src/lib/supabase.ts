import { createClient } from '@supabase/supabase-js';

// === Настройка переменных окружения ===
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Missing Supabase environment variables');
}

// === Инициализация клиента Supabase с поддержкой Realtime ===
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10, // можно увеличить до 50 при активном чате
    },
  },
});

// === Типы данных из базы ===
export type Profile = {
  id: string;
  full_name: string;
  age: number | null;
  university: string | null;
  dormitory: string | null;
  room_number: string | null;
  bio: string | null;
  avatar_url: string | null;
  gender: string | null;
  is_online: boolean;
  last_seen: string;
  created_at: string;
  updated_at: string;
  interests?: string[]; // 👈 добавили
};


export type Interest = {
  id: string;
  name: string;
  category: string;
  icon: string | null;
  created_at: string;
};

export type UserInterest = {
  id: string;
  user_id: string;
  interest_id: string;
  created_at: string;
};

export type Match = {
  id: string;
  user_id: string;
  matched_user_id: string;
  status: string;
  created_at: string;
};

export type Event = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  event_date: string;
  max_participants: number | null;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

export type Conversation = {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  created_at: string;
};

// === Подписка на Realtime события сообщений ===
// (можно вызывать из любого компонента)
export function subscribeToMessages(
  conversationId: string,
  callback: (message: Message) => void
) {
  const channel = supabase
    .channel(`realtime:messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        console.log('📨 Новое сообщение:', payload.new);
        callback(payload.new as Message);
      }
    )
    .subscribe((status) => {
      console.log('🟢 Realtime status:', status);
    });

  // Возвращаем функцию для отписки
  return () => {
    supabase.removeChannel(channel);
  };
}

