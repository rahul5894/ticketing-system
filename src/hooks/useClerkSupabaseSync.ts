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
  tenant?: {
    id: string;
    name: string;
    [key: string]: unknown;
  };
  user?: {
    id: string;
    email: string;
    [key: string]: unknown;
  };
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

  /**
   * Check if sync is needed
   */
  const checkSyncStatus = useCallback(async (tenantId: string) => {
    try {
      console.log('Checking sync status for tenant:', tenantId);

      const response = await fetch(
        `/api/sync?tenant_id=${encodeURIComponent(tenantId)}`
      );

      console.log(
        'Sync status response:',
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Sync status check failed:', errorData);
        throw new Error(
          `Failed to check sync status: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log('Sync status result:', result);
      return result.syncStatus;
    } catch (error) {
      console.error('Error checking sync status:', error);
      throw error;
    }
  }, []);

  /**
   * Perform sync operation
   */
  const performSync = useCallback(
    async (tenantId: string) => {
      setSyncStatus((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        console.log('Starting Clerk-Supabase sync...');

        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tenantId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Sync failed');
        }

        const result = await response.json();

        console.log('Sync completed successfully:', result);

        setSyncData(result.data);
        setSyncStatus({
          isLoading: false,
          isComplete: true,
          error: null,
          needsSync: false,
          tenantExists: true,
          userExists: true,
        });

        // Switch from mock data to real data
        setUseMockData(false);

        // Load real tickets from Supabase
        if (tenantId) {
          await loadTicketsFromAPI(tenantId);
        }

        return result;
      } catch (error) {
        console.error('Sync failed:', error);

        setSyncStatus((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown sync error',
        }));

        throw error;
      }
    },
    [setUseMockData, loadTicketsFromAPI]
  );

  /**
   * Auto-sync on user authentication and tenant availability
   */
  useEffect(() => {
    if (!isLoaded || !user || !tenantId) {
      return;
    }

    const autoSync = async () => {
      try {
        console.log('Starting auto-sync for tenant:', tenantId);
        console.log('User loaded:', isLoaded, 'User ID:', user?.id);

        if (!tenantId) {
          console.log('No tenant ID available, skipping sync');
          return;
        }

        if (!user?.id) {
          console.log('No user ID available, skipping sync');
          return;
        }

        console.log('Checking if sync is needed for tenant:', tenantId);

        // Check if sync is needed
        const status = await checkSyncStatus(tenantId);

        setSyncStatus((prev) => ({
          ...prev,
          needsSync: status.needsSync,
          tenantExists: status.tenantExists,
          userExists: status.userExists,
        }));

        if (status.needsSync) {
          console.log('Sync needed, performing automatic sync...');
          await performSync(tenantId);
        } else {
          console.log('Sync not needed, switching to real data...');

          // Data already exists, just switch to real data
          setUseMockData(false);
          await loadTicketsFromAPI(tenantId);

          setSyncStatus((prev) => ({
            ...prev,
            isComplete: true,
            needsSync: false,
          }));
        }
      } catch (error) {
        console.error('Auto-sync failed:', error);

        // Fall back to mock data on sync failure
        setUseMockData(true);

        setSyncStatus((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Auto-sync failed',
          isLoading: false,
        }));
      }
    };

    // Debounce the auto-sync to avoid multiple calls
    const timeoutId = setTimeout(autoSync, 1000);

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

  /**
   * Manual sync trigger
   */
  const triggerSync = useCallback(async () => {
    if (!user || !tenantId) {
      throw new Error('User or tenant not available');
    }

    return await performSync(tenantId);
  }, [user, tenantId, performSync]);

  /**
   * Reset sync status
   */
  const resetSync = useCallback(() => {
    setSyncStatus({
      isLoading: false,
      isComplete: false,
      error: null,
      needsSync: false,
      tenantExists: false,
      userExists: false,
    });
    setSyncData({});
  }, []);

  return {
    syncStatus,
    syncData,
    triggerSync,
    resetSync,
    isReady: isLoaded && !!user && !!tenantId,
  };
}

