'use client';

import { useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useTenant } from '@/features/tenant/context/TenantContext';
import { useSupabase } from '@/features/shared/components/SupabaseProvider';
import { useTicketingStore } from '@/features/ticketing/store/use-ticketing-store';
import { cacheService } from './cache-service';

/**
 * Hook to integrate cache with the application
 * Handles cache initialization, sync, and cleanup
 */
export function useCacheIntegration() {
  const { isSignedIn } = useAuth();
  const { tenantId } = useTenant();
  const { supabase } = useSupabase();
  const { 
    loadTicketsFromCache, 
    syncWithCache, 
    clearCacheForTenant,
    isCacheLoaded,
    lastCacheSync 
  } = useTicketingStore();

  // Initialize cache service with Supabase client
  useEffect(() => {
    if (supabase) {
      cacheService.initialize(supabase);
    }
  }, [supabase]);

  // Load cache when tenant changes
  useEffect(() => {
    if (isSignedIn && tenantId && !isCacheLoaded) {
      loadTicketsFromCache(tenantId);
    }
  }, [isSignedIn, tenantId, isCacheLoaded, loadTicketsFromCache]);

  // Periodic sync with backend
  useEffect(() => {
    if (!isSignedIn || !tenantId) return;

    const syncInterval = setInterval(() => {
      const timeSinceLastSync = Date.now() - lastCacheSync;
      const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

      if (timeSinceLastSync > SYNC_INTERVAL) {
        syncWithCache(tenantId);
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(syncInterval);
  }, [isSignedIn, tenantId, lastCacheSync, syncWithCache]);

  // Clear cache on logout
  useEffect(() => {
    if (!isSignedIn && tenantId) {
      clearCacheForTenant(tenantId);
    }
  }, [isSignedIn, tenantId, clearCacheForTenant]);

  // Manual sync function
  const manualSync = useCallback(async () => {
    if (tenantId) {
      await syncWithCache(tenantId);
    }
  }, [tenantId, syncWithCache]);

  // Clear cache function
  const clearCache = useCallback(async () => {
    if (tenantId) {
      await clearCacheForTenant(tenantId);
    }
  }, [tenantId, clearCacheForTenant]);

  // Get cache stats
  const getCacheStats = useCallback(async () => {
    if (tenantId) {
      return await cacheService.getCacheStats(tenantId);
    }
    return null;
  }, [tenantId]);

  return {
    manualSync,
    clearCache,
    getCacheStats,
    isCacheLoaded,
    lastCacheSync,
  };
}
