'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useTicketingStore } from '@/features/ticketing/store/use-ticketing-store';

export interface SyncStatus {
  isLoading: boolean;
  isComplete: boolean;
  error: string | null;
  needsSync: boolean;
  tenantExists: boolean;
  userExists: boolean;
}

export interface SyncData {
  tenant?: { id: string; name: string; [key: string]: unknown };
  user?: { id: string; email: string; [key: string]: unknown };
  organization?: {
    id: string;
    name: string;
    slug: string;
    [key: string]: unknown;
  };
}

export function useClerkSupabaseSync(tenantId: string | null) {
  const { user, isLoaded } = useUser();
  const { setUseMockData, loadTicketsFromAPI } = useTicketingStore();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isLoading: false,
    isComplete: false,
    error: null,
    needsSync: false,
    tenantExists: false,
    userExists: false,
  });

  const [syncData, setSyncData] = useState<SyncData>({});

  const checkSyncStatus = useCallback(async (tenantId: string) => {
    try {
      const response = await fetch(
        `/api/sync?tenant_id=${encodeURIComponent(tenantId)}`
      );
      const data = await response.json();
      return (
        data.syncStatus || {
          needsSync: true,
          tenantExists: false,
          userExists: false,
        }
      );
    } catch {
      return { needsSync: true, tenantExists: false, userExists: false };
    }
  }, []);

  const performSync = useCallback(
    async (tenantId: string) => {
      setSyncStatus((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Sync failed');
        }

        setSyncStatus((prev) => ({
          ...prev,
          isLoading: false,
          isComplete: true,
          needsSync: false,
          tenantExists: true,
          userExists: true,
        }));

        setSyncData(result.data || {});
        setUseMockData(false);

        if (tenantId) {
          await loadTicketsFromAPI(tenantId);
        }
      } catch (error) {
        setSyncStatus((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Sync failed',
        }));
      }
    },
    [setUseMockData, loadTicketsFromAPI]
  );

  useEffect(() => {
    if (!isLoaded || !user || !tenantId) return;

    const initSync = async () => {
      try {
        const status = await checkSyncStatus(tenantId);
        setSyncStatus((prev) => ({ ...prev, ...status }));

        if (status.needsSync) {
          await performSync(tenantId);
        } else {
          setUseMockData(false);
          await loadTicketsFromAPI(tenantId);
        }
      } catch (error) {
        setSyncStatus((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Sync initialization failed',
        }));
      }
    };

    const timeoutId = setTimeout(initSync, 1000);
    return () => clearTimeout(timeoutId);
  }, [
    isLoaded,
    user,
    tenantId,
    checkSyncStatus,
    performSync,
    setUseMockData,
    loadTicketsFromAPI,
  ]);

  const triggerSync = useCallback(async () => {
    if (!user || !tenantId) throw new Error('User or tenant not available');
    return await performSync(tenantId);
  }, [user, tenantId, performSync]);

  return { syncStatus, syncData, triggerSync };
}
