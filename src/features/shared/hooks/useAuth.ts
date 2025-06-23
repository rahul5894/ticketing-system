'use client';

import { useUser, useAuth as useClerkAuth } from '@clerk/nextjs';
import { useTenant } from '@/features/tenant/context/TenantContext';
import { getDomainFromWindow, DomainInfoState } from '@/lib/domain';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tenant } from '@/features/tenant/models/tenant.schema';

export interface AuthState {
  user: ReturnType<typeof useUser>['user'];
  isLoaded: boolean;
  isSignedIn: boolean;
  tenant: Tenant | null;
  tenantId: string | null;
  isAdmin: boolean;
  isAgent: boolean;
  isUser: boolean;
  domainInfo: DomainInfoState;
  requiresAuth: boolean;
}

/**
 * Comprehensive authentication hook that combines Clerk auth with tenant context
 */
export function useAuth(): AuthState {
  const { user, isLoaded, isSignedIn } = useUser();
  const { tenant, tenantId } = useTenant();
  const [domainInfo, setDomainInfo] = useState<DomainInfoState>(null);

  useEffect(() => {
    setDomainInfo(getDomainFromWindow());
  }, []);

  // Determine user role from Clerk metadata or tenant context
  const userRole = (user?.publicMetadata?.role as string) || 'user';
  const isAdmin = userRole === 'admin';
  const isAgent = userRole === 'agent' || isAdmin;
  const isUser = userRole === 'user' || isAgent;

  // Determine if authentication is required based on domain
  const requiresAuth = domainInfo?.isSubdomain || false;

  return {
    user,
    isLoaded,
    isSignedIn: isSignedIn || false,
    tenant,
    tenantId,
    isAdmin,
    isAgent,
    isUser,
    domainInfo,
    requiresAuth,
  };
}

/**
 * Hook for checking if user has specific permissions
 */
export function usePermissions() {
  const { isAdmin, isAgent, isUser, tenant } = useAuth();

  const hasPermission = (permission: string): boolean => {
    // Admin has all permissions
    if (isAdmin) return true;

    // Check tenant-specific permissions
    const tenantFeatures = tenant?.settings?.features || [];

    switch (permission) {
      case 'tickets.view':
        return isUser;
      case 'tickets.create':
        return isUser;
      case 'tickets.update':
        return isAgent;
      case 'tickets.delete':
        return isAdmin;
      case 'tickets.assign':
        return isAgent;
      case 'analytics.view':
        return isAgent && tenantFeatures.includes('analytics');
      case 'integrations.manage':
        return isAdmin && tenantFeatures.includes('integrations');
      case 'users.manage':
        return isAdmin;
      case 'settings.manage':
        return isAdmin;
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
    isAdmin,
    isAgent,
    isUser,
  };
}

/**
 * Hook for authentication actions with smooth transitions
 */
export function useAuthActions() {
  const { signOut } = useClerkAuth();
  const { domainInfo } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();

      // Use programmatic navigation for smooth transitions
      if (domainInfo?.isLocalhost) {
        router.replace('/');
      } else {
        router.replace('/sign-in');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      // Fallback to window.location only on error
      window.location.href = '/sign-in';
    }
  };

  const redirectToSignIn = () => {
    router.push('/sign-in');
  };

  const redirectToSignUp = () => {
    router.push('/sign-up');
  };

  const redirectToTickets = () => {
    router.push('/tickets');
  };

  return {
    signOut: handleSignOut,
    redirectToSignIn,
    redirectToSignUp,
    redirectToTickets,
  };
}

/**
 * Hook for protecting components that require authentication with smooth transitions
 */
export function useRequireAuth() {
  const { isLoaded, isSignedIn, requiresAuth } = useAuth();
  const router = useRouter();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (isLoaded && requiresAuth && !isSignedIn) {
      setShouldRedirect(true);
    }
  }, [isLoaded, requiresAuth, isSignedIn]);

  useEffect(() => {
    if (shouldRedirect) {
      router.replace('/sign-in');
    }
  }, [shouldRedirect, router]);

  return {
    isLoading: !isLoaded,
    isAuthenticated: isSignedIn,
    requiresAuth,
    shouldRedirect,
  };
}

/**
 * Hook for tenant-specific authentication checks
 */
export function useTenantAuth() {
  const { user, tenant, tenantId, isLoaded } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded || !user || !tenantId) {
      setHasAccess(null);
      return;
    }

    // Check if user has access to this tenant
    // In a real app, this would check the user_tenants table
    // For now, we'll assume all authenticated users have access
    setHasAccess(true);
  }, [isLoaded, user, tenantId]);

  return {
    hasAccess,
    tenant,
    tenantId,
    isLoading: !isLoaded || hasAccess === null,
  };
}

