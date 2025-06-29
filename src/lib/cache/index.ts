// Cache system exports
export { cacheDB, TicketingCacheDB } from './dexie-db';
export type { 
  CachedTicket, 
  CachedResponse, 
  CachedUser, 
  CacheMetadata 
} from './dexie-db';

export { cacheService, CacheService } from './cache-service';
export { useCacheIntegration } from './use-cache-integration';

// Cache utilities
export const CACHE_CONSTANTS = {
  SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutes
  CACHE_VERSION: 1,
  MAX_CACHE_AGE: 24 * 60 * 60 * 1000, // 24 hours
} as const;
