'use client';

import { useUser, useAuth as useClerkAuth, useSession } from '@clerk/nextjs';
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
  const { session } = useSession();
  const { tenant, tenantId } = useTenant();
  const [domainInfo, setDomainInfo] = useState<DomainInfoState>(null);

  useEffect(() => {
    setDomainInfo(getDomainFromWindow());
  }, []);

  // Get user role from multiple sources with proper fallback
  const [userRole, setUserRole] = useState<string>('user');

  useEffect(() => {
    const getRole = async () => {
      if (!user?.id) return;

      try {
        // 1. Try to get role from JWT claims (now with comprehensive claims)
        if (session) {
          try {
            const token = await session.getToken();
            if (token && token.split('.').length === 3) {
              const payloadPart = token.split('.')[1];
              if (payloadPart) {
                const payload = JSON.parse(atob(payloadPart));

                // Check multiple sources in JWT for role
                const roleFromJWT = payload.role;
                const userMetadata = payload.user_metadata;
                const orgPermissions = payload.org_permissions;

                console.log('🎯 JWT Claims Debug:', {
                  role: roleFromJWT,
                  user_metadata: userMetadata,
                  org_permissions: orgPermissions,
                  email: payload.email,
                  tenant_id: payload.tenant_id,
                });

                // Priority 1: Organization role
                if (roleFromJWT && roleFromJWT !== 'authenticated') {
                  console.log('🎯 Role from JWT org.role:', roleFromJWT);
                  setUserRole(roleFromJWT);
                  return;
                }

                // Priority 2: User metadata role
                if (
                  userMetadata &&
                  typeof userMetadata === 'object' &&
                  userMetadata.role
                ) {
                  console.log(
                    '🎯 Role from JWT user_metadata:',
                    userMetadata.role
                  );
                  setUserRole(userMetadata.role);
                  return;
                }
              }
            }
          } catch (error) {
            console.warn('Could not decode JWT token:', error);
          }
        }

        // 2. Fallback to publicMetadata
        const roleFromMetadata = user?.publicMetadata?.role as string;
        if (roleFromMetadata) {
          console.log('🎯 Role from publicMetadata:', roleFromMetadata);
          setUserRole(roleFromMetadata);
          return;
        }

        // 3. Special case for super admin email (temporary until JWT claims are fully configured)
        if (
          user.emailAddresses?.[0]?.emailAddress === 'rohitjohn5822@gmail.com'
        ) {
          console.log('🎯 Role from email fallback: super_admin');
          setUserRole('super_admin');
          return;
        }

        // 4. Default fallback
        console.log('🎯 Using default role: user');
        setUserRole('user');
      } catch (error) {
        console.error('Error getting user role:', error);
        setUserRole('user');
      }
    };

    if (isLoaded && user) {
      getRole();
    }
  }, [session, user, isLoaded]);

  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin' || isSuperAdmin;
  const isAgent = userRole === 'agent';
  const isUser = userRole === 'user' || userRole === 'member';

  // Debug logging for development
  if (process.env.NODE_ENV === 'development' && user) {
    console.log('🔍 Auth Debug Info:', {
      userId: user.id,
      email: user.emailAddresses?.[0]?.emailAddress,
      publicMetadata: user.publicMetadata,
      userRole,
      isSuperAdmin,
      isAdmin,
      isAgent,
      isUser,
    });
  }

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
    if (isSuperAdmin || isAdmin) {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `✅ Permission "${permission}" granted for ${
            isSuperAdmin ? 'super_admin' : 'admin'
          }`
        );
      }
      return true;
    }

    // Check tenant-specific permissions
    const tenantFeatures = tenant?.settings?.features || [];

    let hasAccess = false;
    switch (permission) {
      case 'tickets.view':
        hasAccess = isUser || isAgent;
        break;
      case 'tickets.create':
        hasAccess = isSuperAdmin || isAdmin; // Only Super Admin and Admin can create tickets
        break;
      case 'tickets.update':
        hasAccess = isAgent || isAdmin || isSuperAdmin;
        break;
      case 'tickets.delete':
        hasAccess = isAdmin || isSuperAdmin;
        break;
      case 'tickets.assign':
        hasAccess = isAdmin || isSuperAdmin;
        break;
      case 'tickets.priority.change':
        hasAccess = isAdmin || isSuperAdmin; // Only Admin/Super Admin can change priority
        break;
      case 'tickets.department.change':
        hasAccess = isAdmin || isSuperAdmin; // Only Admin/Super Admin can change department
        break;
      case 'analytics.view':
        hasAccess =
          (isAgent || isAdmin || isSuperAdmin) &&
          tenantFeatures.includes('analytics');
        break;
      case 'integrations.manage':
        hasAccess =
          (isAdmin || isSuperAdmin) && tenantFeatures.includes('integrations');
        break;
      case 'users.manage':
        hasAccess = isAdmin || isSuperAdmin;
        break;
      case 'settings.manage':
        hasAccess = isAdmin || isSuperAdmin;
        break;
      default:
        hasAccess = false;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 Permission Check: "${permission}"`, {
        hasAccess,
        isSuperAdmin,
        isAdmin,
        isAgent,
        isUser,
        tenantFeatures,
      });
    }

    return hasAccess;
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
