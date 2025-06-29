'use client';

import { useUser, useClerk } from '@clerk/nextjs';
import { useTenant } from '@/features/tenant/context/TenantContext';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Tenant } from '@/features/tenant/models/tenant.schema';

export interface AuthState {
  user: ReturnType<typeof useUser>['user'];
  isLoaded: boolean;
  isSignedIn: boolean;
  tenant: Tenant | null;
  tenantId: string | null;
  role: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  isUser: boolean;
  isTransitioning: boolean;
}

export interface AuthActions {
  signOut: () => Promise<void>;
  navigateToTickets: () => void;
  navigateToSignIn: () => void;
  navigateToSignUp: () => void;
}

/**
 * Optimized authentication hook with modern 2025 patterns
 */
export function useAuth(): AuthState & AuthActions {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const { tenant, tenantId } = useTenant();
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Get role with simplified logic
  const role =
    (user?.publicMetadata?.role as string) ||
    (user?.emailAddresses?.[0]?.emailAddress === 'rohitjohn5822@gmail.com'
      ? 'super_admin'
      : 'user');

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || isSuperAdmin;
  const isAgent = role === 'agent';
  const isUser = role === 'user' || role === 'member';

  const signOut = useCallback(async () => {
    setIsTransitioning(true);
    try {
      await clerkSignOut();
      router.replace('/sign-in');
    } catch {
      window.location.href = '/sign-in';
    } finally {
      setIsTransitioning(false);
    }
  }, [clerkSignOut, router]);

  const navigateToTickets = useCallback(() => {
    setIsTransitioning(true);
    router.push('/tickets');
    setTimeout(() => setIsTransitioning(false), 100);
  }, [router]);

  const navigateToSignIn = useCallback(() => {
    setIsTransitioning(true);
    router.push('/sign-in');
    setTimeout(() => setIsTransitioning(false), 100);
  }, [router]);

  const navigateToSignUp = useCallback(() => {
    setIsTransitioning(true);
    router.push('/sign-up');
    setTimeout(() => setIsTransitioning(false), 100);
  }, [router]);

  return {
    user,
    isLoaded,
    isSignedIn: isSignedIn || false,
    tenant,
    tenantId,
    role,
    isSuperAdmin,
    isAdmin,
    isAgent,
    isUser,
    isTransitioning,
    signOut,
    navigateToTickets,
    navigateToSignIn,
    navigateToSignUp,
  };
}

/**
 * Hook for checking if user has specific permissions
 */
export function usePermissions() {
  const { isSuperAdmin, isAdmin, isAgent, isUser, tenant } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (isSuperAdmin || isAdmin) return true;

    const tenantFeatures = tenant?.settings?.features || [];

    switch (permission) {
      case 'tickets.view':
        return isUser || isAgent;
      case 'tickets.create':
        return isSuperAdmin || isAdmin;
      case 'tickets.update':
        return isAgent || isAdmin || isSuperAdmin;
      case 'tickets.delete':
        return isAdmin || isSuperAdmin;
      case 'tickets.assign':
        return isAdmin || isSuperAdmin;
      case 'tickets.priority.change':
        return isAdmin || isSuperAdmin;
      case 'tickets.department.change':
        return isAdmin || isSuperAdmin;
      case 'analytics.view':
        return (
          (isAgent || isAdmin || isSuperAdmin) &&
          tenantFeatures.includes('analytics')
        );
      case 'integrations.manage':
        return (
          (isAdmin || isSuperAdmin) && tenantFeatures.includes('integrations')
        );
      case 'users.manage':
        return isAdmin || isSuperAdmin;
      case 'settings.manage':
        return isAdmin || isSuperAdmin;
      default:
        return false;
    }
  };

  const canAccessFeature = (feature: string): boolean => {
    const tenantFeatures = tenant?.settings?.features || [];
    return tenantFeatures.includes(feature);
  };

  return {
    hasPermission,
    canAccessFeature,
    isSuperAdmin,
    isAdmin,
    isAgent,
    isUser,
  };
}
