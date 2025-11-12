import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useTypingIndicator(conversationId: string | null, userId: string | undefined) {
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTypingUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!conversationId || !userId) return;

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          if (payload.new && 'user_id' in payload.new) {
            const typingUserId = payload.new.user_id;
            if (typingUserId !== userId) {
              setIsOtherUserTyping(true);

              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }

              typingTimeoutRef.current = setTimeout(() => {
                setIsOtherUserTyping(false);
              }, 3000);
            }
          }

          if (payload.eventType === 'DELETE' && payload.old && 'user_id' in payload.old) {
            const stoppedTypingUserId = payload.old.user_id;
            if (stoppedTypingUserId !== userId) {
              setIsOtherUserTyping(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      channel.unsubscribe();
    };
  }, [conversationId, userId]);

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!conversationId || !userId) return;

    const now = Date.now();
    if (isTyping && now - lastTypingUpdateRef.current < 2000) {
      return;
    }
    lastTypingUpdateRef.current = now;

    try {
      if (isTyping) {
        await supabase
          .from('typing_indicators')
          .upsert({
            conversation_id: conversationId,
            user_id: userId,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'conversation_id,user_id'
          });
      } else {
        await supabase
          .from('typing_indicators')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Error updating typing indicator:', error);
    }
  }, [conversationId, userId]);

  return { isOtherUserTyping, setTyping };
}
