/**
 * Modern 2025 Supabase Real-time Hook
 *
 * Minimal, robust implementation with automatic reconnection and persistent connections
 * Follows latest Supabase best practices for connection management
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useSupabaseClient } from '@/lib/supabase-client';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

interface RealtimeConfig {
  table: string;
  schema?: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  isReady: boolean;
  error: string | null;
  reconnectAttempts: number;
}

interface RealtimeEvent<T extends DatabaseRecord> {
  id: number;
  type: string;
  timestamp: string;
  payload: RealtimePostgresChangesPayload<T>;
}

interface UseRealtimeSubscriptionReturn<T extends DatabaseRecord> {
  connectionState: ConnectionState;
  data: T[];
  events: RealtimeEvent<T>[];
}

interface DatabaseRecord {
  id: string;
  [key: string]: unknown;
}

interface PostgresChangesConfig {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema: string;
  table: string;
  filter?: string;
}

export function useRealtimeSubscription<
  T extends DatabaseRecord = DatabaseRecord
>(
  config: RealtimeConfig,
  tenantId: string | null,
  enabled: boolean = true
): UseRealtimeSubscriptionReturn<T> {
  const { client: supabase, isRealtimeReady } = useSupabaseClient();
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    isReady: false,
    error: null,
    reconnectAttempts: 0,
  });
  const [data, setData] = useState<T[]>([]);
  const [events, setEvents] = useState<RealtimeEvent<T>[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    if (!enabled || !tenantId || !isRealtimeReady || !supabase) {
      setConnectionState({
        status: 'disconnected',
        isReady: false,
        error: null,
        reconnectAttempts: 0,
      });
      return;
    }

    let isSubscribed = true;
    setConnectionState((prev) => ({ ...prev, status: 'connecting' }));

    const setupConnection = () => {
      if (!isSubscribed) return;

      const channelName = `${config.table}-${tenantId}-${Date.now()}`;
      const channel = supabase.channel(channelName);

      const subscriptionConfig: PostgresChangesConfig = {
        event: config.event || '*',
        schema: config.schema || 'public',
        table: config.table,
        ...(config.filter && { filter: config.filter }),
      };

      channel
        .on(
          'postgres_changes' as 'system',
          subscriptionConfig,
          (payload: RealtimePostgresChangesPayload<T>) => {
            if (!isSubscribed) return;

            const eventId = Date.now() + Math.random();
            const event = {
              id: eventId,
              type: payload.eventType,
              timestamp: new Date().toISOString(),
              payload,
            };

            setEvents((prev) => [event, ...prev.slice(0, 9)]);

            if (payload.eventType === 'INSERT' && payload.new) {
              setData((prev) => [payload.new as T, ...prev]);
            } else if (payload.eventType === 'DELETE' && payload.old) {
              setData((prev) =>
                prev.filter((item) => item.id !== (payload.old as T).id)
              );
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              setData((prev) =>
                prev.map((item) =>
                  item.id === (payload.new as T).id ? (payload.new as T) : item
                )
              );
            }
          }
        )
        .subscribe((status: string, err?: Error) => {
          if (!isSubscribed) return;

          if (err) {
            setConnectionState((prev) => ({
              ...prev,
              status: 'error',
              error: err.message,
              isReady: false,
            }));

            // Simple reconnection logic
            if (reconnectAttemptsRef.current < 3) {
              reconnectAttemptsRef.current += 1;
              const timeoutId = setTimeout(() => {
                if (isSubscribed) {
                  supabase.removeChannel(channel);
                  setupConnection();
                }
              }, 2000 * reconnectAttemptsRef.current);
              reconnectTimeoutRef.current = timeoutId;
            }
          } else {
            reconnectAttemptsRef.current = 0;
            setConnectionState((prev) => ({
              ...prev,
              status: status === 'SUBSCRIBED' ? 'connected' : 'connecting',
              isReady: status === 'SUBSCRIBED',
              error: null,
              reconnectAttempts: 0,
            }));
          }
        });

      channelRef.current = channel;
    };

    setupConnection();

    return () => {
      isSubscribed = false;
      const timeoutId = reconnectTimeoutRef.current;
      const channel = channelRef.current;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
      setConnectionState({
        status: 'disconnected',
        isReady: false,
        error: null,
        reconnectAttempts: 0,
      });
    };
  }, [
    enabled,
    tenantId,
    isRealtimeReady,
    supabase,
    config.table,
    config.schema,
    config.filter,
    config.event,
  ]);

  return {
    connectionState,
    data,
    events,
  };
}

