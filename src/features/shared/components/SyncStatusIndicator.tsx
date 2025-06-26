'use client';

import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { Alert, AlertDescription } from '@/features/shared/components/ui/alert';
import type { SyncStatus } from '@/hooks/useClerkSupabaseSync';

interface SyncStatusIndicatorProps {
  syncStatus: SyncStatus;
  onRetry?: () => void;
  className?: string;
}

export function SyncStatusIndicator({
  syncStatus,
  onRetry,
  className = '',
}: SyncStatusIndicatorProps) {
  // For seamless UX, only show sync status in development mode
  // In production, sync happens transparently in background
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // Don't show anything if sync is complete and successful
  if (syncStatus.isComplete && !syncStatus.error) {
    return null;
  }

  // Loading state (only in development)
  if (syncStatus.isLoading) {
    return (
      <Alert className={`border-blue-200 bg-blue-50 ${className}`}>
        <Loader2 className='h-4 w-4 animate-spin text-blue-600' />
        <AlertDescription className='text-blue-800'>
          🔄 Background sync in progress...
        </AlertDescription>
      </Alert>
    );
  }

  // Error state (only in development - production handles errors silently)
  if (syncStatus.error) {
    return (
      <Alert className={`border-red-200 bg-red-50 ${className}`}>
        <AlertCircle className='h-4 w-4 text-red-600' />
        <AlertDescription className='text-red-800'>
          <div className='flex items-center justify-between'>
            <span>❌ Background sync failed: {syncStatus.error}</span>
            {onRetry && (
              <Button
                variant='outline'
                size='sm'
                onClick={onRetry}
                className='ml-2 border-red-300 text-red-700 hover:bg-red-100'
              >
                <RefreshCw className='h-3 w-3 mr-1' />
                Retry
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Success state (only in development)
  if (syncStatus.isComplete) {
    return (
      <Alert className={`border-green-200 bg-green-50 ${className}`}>
        <CheckCircle className='h-4 w-4 text-green-600' />
        <AlertDescription className='text-green-800'>
          ✅ Background sync completed successfully!
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

interface SyncStatusBadgeProps {
  syncStatus: SyncStatus;
  compact?: boolean;
}

export function SyncStatusBadge({
  syncStatus,
  compact = false,
}: SyncStatusBadgeProps) {
  if (syncStatus.isLoading) {
    return (
      <div className='flex items-center text-blue-600 text-sm'>
        <Loader2 className='h-3 w-3 animate-spin mr-1' />
        {!compact && <span>Syncing...</span>}
      </div>
    );
  }

  if (syncStatus.error) {
    return (
      <div className='flex items-center text-red-600 text-sm'>
        <AlertCircle className='h-3 w-3 mr-1' />
        {!compact && <span>Sync Error</span>}
      </div>
    );
  }

  if (syncStatus.isComplete) {
    return (
      <div className='flex items-center text-green-600 text-sm'>
        <CheckCircle className='h-3 w-3 mr-1' />
        {!compact && <span>Synced</span>}
      </div>
    );
  }

  return null;
}

interface SyncDebugInfoProps {
  syncStatus: SyncStatus;
  syncData?: {
    tenant?: unknown;
    user?: unknown;
    organization?: unknown;
  };
  show?: boolean;
}

export function SyncDebugInfo({
  syncStatus,
  syncData,
  show = false,
}: SyncDebugInfoProps) {
  if (!show) return null;

  return (
    <div className='mt-4 p-3 bg-gray-100 rounded-md text-xs font-mono'>
      <div className='font-semibold mb-2'>Sync Debug Info:</div>
      <div>Loading: {syncStatus.isLoading ? 'Yes' : 'No'}</div>
      <div>Complete: {syncStatus.isComplete ? 'Yes' : 'No'}</div>
      <div>Needs Sync: {syncStatus.needsSync ? 'Yes' : 'No'}</div>
      <div>Tenant Exists: {syncStatus.tenantExists ? 'Yes' : 'No'}</div>
      <div>User Exists: {syncStatus.userExists ? 'Yes' : 'No'}</div>
      {syncStatus.error && <div>Error: {syncStatus.error}</div>}
      {syncData && (
        <div className='mt-2'>
          <div>Sync Data:</div>
          <pre className='text-xs overflow-auto max-h-32'>
            {JSON.stringify(syncData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

