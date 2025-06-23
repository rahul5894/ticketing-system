'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Tenant, mockTenants } from '../models/tenant.schema';
import { getDomainFromWindow } from '@/lib/domain';

interface TenantContextValue {
  tenant: Tenant | null;
  tenantId: string | null;
  isLoading: boolean;
  error: string | null;
  switchTenant: (tenantId: string) => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

interface TenantProviderProps {
  children: React.ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const { isLoaded } = useUser();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    const initializeTenant = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get tenant from domain
        const domainInfo = getDomainFromWindow();

        if (domainInfo.isLocalhost) {
          // For localhost, use a default tenant or no tenant
          setTenantId(null);
          setTenant(null);
          setIsLoading(false);
          return;
        }

        if (domainInfo.tenantId) {
          // Find tenant by subdomain
          const foundTenant = mockTenants.find(
            (t) => t.id === domainInfo.tenantId
          );

          if (foundTenant) {
            setTenantId(foundTenant.id);
            setTenant(foundTenant);
          } else {
            setError(`Tenant not found: ${domainInfo.tenantId}`);
          }
        } else {
          setError('No tenant specified in domain');
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to initialize tenant'
        );
      } finally {
        setIsLoading(false);
      }
    };

    initializeTenant();
  }, [isLoaded]);

  const switchTenant = async (newTenantId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const foundTenant = mockTenants.find((t) => t.id === newTenantId);

      if (foundTenant) {
        setTenantId(foundTenant.id);
        setTenant(foundTenant);

        // In a real app, you would redirect to the new tenant's domain
        // For now, we'll just update the state
      } else {
        throw new Error(`Tenant not found: ${newTenantId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch tenant');
    } finally {
      setIsLoading(false);
    }
  };

  const value: TenantContextValue = {
    tenant,
    tenantId,
    isLoading,
    error,
    switchTenant,
  };

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

export function useTenantId() {
  const { tenantId } = useTenant();
  return tenantId;
}

export function useRequiredTenant() {
  const { tenant, isLoading, error } = useTenant();

  if (isLoading) {
    throw new Error('Tenant is still loading');
  }

  if (error) {
    throw new Error(`Tenant error: ${error}`);
  }

  if (!tenant) {
    throw new Error('No tenant available');
  }

  return tenant;
}

