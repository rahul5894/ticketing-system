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
  isSuperAdmin: boolean;
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
  const userRole = (user?.publicMetadata?.role as string) || 'member';
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin' || isSuperAdmin;
  const isAgent = userRole === 'agent';
  const isUser = userRole === 'member' || userRole === 'user';

  // Determine if authentication is required based on domain
  const requiresAuth = domainInfo?.isSubdomain || false;

  return {
    user,
    isLoaded,
    isSignedIn: isSignedIn || false,
    tenant,
    tenantId,
    isSuperAdmin,
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
  const { isSuperAdmin, isAdmin, isAgent, isUser, tenant } = useAuth();

  const hasPermission = (permission: string): boolean => {
    // Super Admin and Admin have all permissions
    if (isSuperAdmin || isAdmin) return true;

    // Check tenant-specific permissions
    const tenantFeatures = tenant?.settings?.features || [];

    switch (permission) {
      case 'tickets.view':
        return isUser || isAgent;
      case 'tickets.create':
        return isSuperAdmin || isAdmin; // Only Super Admin and Admin can create tickets
      case 'tickets.update':
        return isAgent || isAdmin || isSuperAdmin;
      case 'tickets.delete':
        return isAdmin || isSuperAdmin;
      case 'tickets.assign':
        return isAdmin || isSuperAdmin;
      case 'tickets.priority.change':
        return isAdmin || isSuperAdmin; // Only Admin/Super Admin can change priority
      case 'tickets.department.change':
        return isAdmin || isSuperAdmin; // Only Admin/Super Admin can change department
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

