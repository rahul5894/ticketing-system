/**
 * Modern 2025+ Supabase Real-time Hook
 *
 * A robust, minimal implementation for Supabase Realtime subscriptions
 * with automatic reconnection logic and detailed connection state tracking.
 * It follows the latest Supabase best practices for connection management.
 */
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSupabase } from '@/features/shared/components/SupabaseProvider';
import type {
  RealtimePostgresChangesPayload,
  REALTIME_SUBSCRIBE_STATES,
} from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/realtime-js';

// --- Type Definitions ---

interface RealtimeConfig {
  table: string;
  schema?: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'closed'
  | 'error';

interface ConnectionState {
  status: ConnectionStatus;
  error: Error | null;
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

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY_MS = 1000;

// --- Main Hook ---

export function useRealtimeSubscription<
  T extends DatabaseRecord = DatabaseRecord
>(
  config: RealtimeConfig,
  tenantId: string | null,
  enabled: boolean = true
): UseRealtimeSubscriptionReturn<T> {
  const { supabase, isInitialized: isRealtimeReady } = useSupabase();
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    error: null,
    reconnectAttempts: 0,
  });
  const [data, setData] = useState<T[]>([]);
  const [events, setEvents] = useState<RealtimeEvent<T>[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePayload = useCallback(
    (payload: RealtimePostgresChangesPayload<T>) => {
      const eventId = Date.now() + Math.random();
      const event: RealtimeEvent<T> = {
        id: eventId,
        type: payload.eventType,
        timestamp: new Date().toISOString(),
        payload,
      };

      setEvents((prev) => [event, ...prev.slice(0, 19)]);

      switch (payload.eventType) {
        case 'INSERT':
          setData((prev) => [payload.new as T, ...prev]);
          break;
        case 'UPDATE':
          setData((prev) =>
            prev.map((item) =>
              item.id === (payload.new as T).id ? (payload.new as T) : item
            )
          );
          break;
        case 'DELETE':
          setData((prev) =>
            prev.filter((item) => item.id !== (payload.old as T).id)
          );
          break;
      }
    },
    []
  );

  useEffect(() => {
    if (!enabled || !tenantId || !isRealtimeReady || !supabase) {
      return;
    }

    let reconnectAttempts = 0;

    const connect = () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      setConnectionState({
        status: 'connecting',
        error: null,
        reconnectAttempts,
      });

      const channelName = `realtime:${config.table}:${tenantId}`;
      const channel = supabase.channel(channelName);

      const handleSubscriptionEvent = (
        status: `${REALTIME_SUBSCRIBE_STATES}`,
        err?: Error
      ) => {
        switch (status) {
          case 'SUBSCRIBED':
            setConnectionState({
              status: 'connected',
              error: null,
              reconnectAttempts: 0,
            });
            reconnectAttempts = 0;
            if (reconnectTimerRef.current) {
              clearTimeout(reconnectTimerRef.current);
            }
            break;

          case 'TIMED_OUT':
          case 'CHANNEL_ERROR':
          case 'CLOSED':
            setConnectionState((prev) => ({
              ...prev,
              status: status === 'CLOSED' ? 'closed' : 'error',
              error: err || new Error(`Connection status: ${status}`),
            }));
            reconnect();
            break;
        }
      };

      // Create properly typed filter object for postgres_changes
      const filterOpts = {
        schema: config.schema ?? 'public',
        table: config.table,
        event: config.event ?? '*',
        ...(config.filter ? { filter: config.filter } : {}),
      } as const;

      // TypeScript workaround: Supabase realtime overload resolution issue
      // The channel.on() method has multiple overloads and TS cannot resolve the correct one
      // for 'postgres_changes' even with proper typing. This is a known issue in @supabase/realtime-js
      // See: https://github.com/supabase/supabase-js/issues/1451
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (channel as any)
        .on('postgres_changes', filterOpts, handlePayload)
        .subscribe(handleSubscriptionEvent);

      channelRef.current = channel;
    };

    const reconnect = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        setConnectionState((prev) => ({
          ...prev,
          status: 'error',
          error: new Error('Maximum reconnection attempts reached.'),
        }));
        return;
      }

      reconnectAttempts++;
      const delay = INITIAL_RECONNECT_DELAY_MS * 2 ** (reconnectAttempts - 1);

      setConnectionState((prev) => ({
        ...prev,
        status: 'reconnecting',
        reconnectAttempts,
      }));

      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    connect();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
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
    handlePayload,
  ]);

  return {
    connectionState,
    data,
    events,
  };
}
