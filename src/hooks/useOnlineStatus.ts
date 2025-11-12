import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useOnlineStatus(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const updateOnlineStatus = async (isOnline: boolean) => {
      await supabase
        .from('profiles')
        .update({
          is_online: isOnline,
          last_seen: new Date().toISOString()
        })
        .eq('id', userId);
    };

    updateOnlineStatus(true);

    const heartbeatInterval = setInterval(() => {
      updateOnlineStatus(true);
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateOnlineStatus(false);
      } else {
        updateOnlineStatus(true);
      }
    };

    const handleBeforeUnload = () => {
      updateOnlineStatus(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateOnlineStatus(false);
    };
  }, [userId]);
}
