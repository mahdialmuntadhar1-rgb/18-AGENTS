import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export function useSupabaseRealtime() {
  const [recordCount, setRecordCount] = useState(0);

  useEffect(() => {
    // Initial fetch for record count
    const fetchCount = async () => {
      const { count, error } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });
      if (!error && count !== null) setRecordCount(count);
    };
    fetchCount();

    // Subscribe to agent_logs for toast notifications
    const logsSubscription = supabase
      .channel('agent_logs_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_logs' },
        (payload) => {
          const log = payload.new;
          const toastType = log.type === 'error' ? 'error' : log.type === 'warning' ? 'warning' : 'success';
          
          toast[toastType](`[${log.agent_id.toUpperCase()}]`, {
            description: log.message,
          });
        }
      )
      .subscribe();

    // Subscribe to businesses for record count updates
    const businessesSubscription = supabase
      .channel('businesses_count_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'businesses' },
        () => {
          setRecordCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'businesses' },
        () => {
          setRecordCount(prev => Math.max(0, prev - 1));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(logsSubscription);
      supabase.removeChannel(businessesSubscription);
    };
  }, []);

  return { recordCount };
}
