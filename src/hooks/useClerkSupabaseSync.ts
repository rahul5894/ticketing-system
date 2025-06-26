'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useTicketingStore } from '@/features/ticketing/store/use-ticketing-store';
import { useAuthStateManager } from './useAuthStateManager';

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

  // Modern 2025 auth state management with race condition prevention
  const { authState, createRequestSignal, isAuthReady, cancelAllRequests } =
    useAuthStateManager();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isLoading: false,
    isComplete: false,
    error: null,
    needsSync: false,
    tenantExists: false,
    userExists: false,
  });

  const [syncData, setSyncData] = useState<SyncData>({});

  // Track sync operations to prevent multiple concurrent syncs
  const syncInProgress = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check if sync is needed with modern request cancellation
   */
  const checkSyncStatus = useCallback(
    async (tenantId: string) => {
      try {
        console.log('🔍 Checking sync status for tenant:', tenantId);

        const signal = createRequestSignal();

        const response = await fetch(
          `/api/sync?tenant_id=${encodeURIComponent(tenantId)}`,
          {
            signal,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        console.log(
          '✅ Sync status response:',
          response.status,
          response.statusText
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('🚨 Sync status check failed:', errorData);
          throw new Error(
            `Failed to check sync status: ${response.status} ${response.statusText}`
          );
        }

        const result = await response.json();
        console.log('📊 Sync status result:', result);
        return result.syncStatus;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('🚫 Sync status check cancelled');
          throw new Error('Request cancelled');
        }
        console.error('❌ Error checking sync status:', error);
        throw error;
      }
    },
    [createRequestSignal]
  );

  /**
   * Perform sync operation
   */
  const performSync = useCallback(
    async (tenantId: string) => {
      // Prevent multiple concurrent syncs
      if (syncInProgress.current) {
        console.log('🔄 Sync already in progress, skipping...');
        return;
      }

      syncInProgress.current = true;
      setSyncStatus((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        console.log('🔄 Starting Clerk-Supabase sync...');

        // Wait for auth to be ready before proceeding
        if (!isAuthReady) {
          console.log('⏳ Waiting for auth to be ready...');
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        const signal = createRequestSignal();

        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tenantId }),
          signal,
        });

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = response.statusText || errorMessage;
          }
          console.error('🚨 Sync API error:', errorMessage);
          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('✅ Sync completed successfully:', result);

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

        // Load real tickets from Supabase with error handling
        if (tenantId) {
          try {
            await loadTicketsFromAPI(tenantId);
            console.log('✅ Tickets loaded successfully');
          } catch (ticketError) {
            console.warn(
              '⚠️ Failed to load tickets, but sync completed:',
              ticketError
            );
            // Don't throw here - sync was successful even if tickets failed
          }
        }

        return result;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('🚫 Sync operation cancelled');
          setSyncStatus((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        console.error('❌ Sync failed:', error);

        setSyncStatus((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown sync error',
        }));

        throw error;
      } finally {
        syncInProgress.current = false;
      }
    },
    [setUseMockData, loadTicketsFromAPI, isAuthReady, createRequestSignal]
  );

  /**
   * Modern 2025 Auto-sync with race condition prevention
   */
  useEffect(() => {
    // Only proceed if auth is ready and not transitioning
    if (
      !isLoaded ||
      !user ||
      !tenantId ||
      !isAuthReady ||
      authState.isTransitioning
    ) {
      console.log('⏳ Waiting for auth to be ready...', {
        isLoaded,
        hasUser: !!user,
        hasTenantId: !!tenantId,
        isAuthReady,
        isTransitioning: authState.isTransitioning,
      });
      return;
    }

    // Clear any existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Debounced sync to prevent race conditions
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('🔄 Starting modern seamless sync for:', tenantId);

        // Double-check auth state before proceeding
        if (!isAuthReady || authState.isTransitioning) {
          console.log('⚠️ Auth state changed, aborting sync');
          return;
        }

        // Immediately switch to real data mode for seamless UX
        setUseMockData(false);

        // Check if sync is needed with cancellation support
        let status;
        try {
          status = await checkSyncStatus(tenantId);
        } catch (statusError) {
          if (
            statusError instanceof Error &&
            statusError.message === 'Request cancelled'
          ) {
            console.log('🚫 Sync status check was cancelled');
            return;
          }
          console.warn(
            '⚠️ Failed to check sync status, assuming sync needed:',
            statusError
          );
          status = { needsSync: true, tenantExists: false, userExists: false };
        }

        if (status.needsSync) {
          console.log('🔧 Background sync required - performing silently...');

          try {
            await performSync(tenantId);
            console.log('✅ Background sync completed successfully');
          } catch (syncError) {
            console.warn(
              '⚠️ Sync failed, but continuing with fallback:',
              syncError
            );
            // Don't throw - continue with fallback behavior
          }
        } else {
          console.log('✅ Data already synced - loading tickets...');

          // Update status silently
          setSyncStatus({
            isLoading: false,
            isComplete: true,
            error: null,
            needsSync: false,
            tenantExists: status.tenantExists,
            userExists: status.userExists,
          });

          // Load real tickets with error handling
          try {
            await loadTicketsFromAPI(tenantId);
            console.log('✅ Tickets loaded successfully');
          } catch (ticketError) {
            console.warn(
              '⚠️ Failed to load tickets, falling back to mock data:',
              ticketError
            );
            setUseMockData(true);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Request cancelled') {
          console.log('🚫 Sync operation was cancelled');
          return;
        }

        console.error('❌ Background sync failed:', error);

        // Silently fallback to mock data if sync fails
        setUseMockData(true);

        // Log error but don't interrupt user experience
        setSyncStatus((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : 'Background sync failed',
          isLoading: false,
        }));
      }
    }, 2000); // 2 second debounce to prevent race conditions

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [
    isLoaded,
    user,
    tenantId,
    isAuthReady,
    authState.isTransitioning,
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

  // Cleanup effect for request cancellation on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up sync hook - cancelling requests');
      cancelAllRequests();
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [cancelAllRequests]);

  return {
    syncStatus,
    syncData,
    triggerSync,
    resetSync,
    authState,
    isAuthReady,
    isReady: isLoaded && !!user && !!tenantId && isAuthReady,
  };
}

