import { NextRequest } from 'next/server';
import { parseDomain, DomainInfo } from '@/lib/domain';
import { mockTenants } from '../models/tenant.schema';

export interface TenantExtractionResult {
  tenantId: string | null;
  isValid: boolean;
  error?: string | undefined;
  domainInfo: DomainInfo;
}

/**
 * Extract tenant information from a Next.js request
 */
export function extractTenantFromRequest(
  request: NextRequest
): TenantExtractionResult {
  const hostname = request.headers.get('host') || 'localhost:3000';
  const domainInfo = parseDomain(hostname);

  // For localhost, no tenant is required
  if (domainInfo.isLocalhost) {
    return {
      tenantId: null,
      isValid: true,
      domainInfo,
    };
  }

  // For subdomains, extract and validate tenant
  if (domainInfo.isSubdomain && domainInfo.tenantId) {
    const isValidTenant = validateTenant(domainInfo.tenantId);

    return {
      tenantId: domainInfo.tenantId,
      isValid: isValidTenant,
      error: isValidTenant
        ? undefined
        : `Invalid tenant: ${domainInfo.tenantId}`,
      domainInfo,
    };
  }

  // No subdomain detected
  return {
    tenantId: null,
    isValid: false,
    error: 'No tenant specified in domain',
    domainInfo,
  };
}

/**
 * Extract tenant information from window location (client-side)
 */
export function extractTenantFromWindow(): TenantExtractionResult {
  if (typeof window === 'undefined') {
    return {
      tenantId: null,
      isValid: false,
      error: 'Window not available',
      domainInfo: parseDomain('localhost:3000'),
    };
  }

  const domainInfo = parseDomain(window.location.hostname);

  // For localhost, no tenant is required
  if (domainInfo.isLocalhost) {
    return {
      tenantId: null,
      isValid: true,
      domainInfo,
    };
  }

  // For subdomains, extract and validate tenant
  if (domainInfo.isSubdomain && domainInfo.tenantId) {
    const isValidTenant = validateTenant(domainInfo.tenantId);

    return {
      tenantId: domainInfo.tenantId,
      isValid: isValidTenant,
      error: isValidTenant
        ? undefined
        : `Invalid tenant: ${domainInfo.tenantId}`,
      domainInfo,
    };
  }

  // No subdomain detected
  return {
    tenantId: null,
    isValid: false,
    error: 'No tenant specified in domain',
    domainInfo,
  };
}

/**
 * Validate if a tenant exists and is active
 */
export function validateTenant(tenantId: string): boolean {
  if (!tenantId) return false;

  // Check if tenant exists in our mock data
  // In production, this would query the database
  const tenant = mockTenants.find((t) => t.id === tenantId);
  return !!tenant;
}

/**
 * Get tenant information by ID
 */
export function getTenantById(tenantId: string) {
  return mockTenants.find((t) => t.id === tenantId);
}

/**
 * Check if a user has access to a specific tenant
 * This would typically check user-tenant relationships in the database
 */
export function hasUserAccessToTenant(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _tenantId: string
): boolean {
  // For now, return true for all users
  // In production, this would check the user_tenants table
  return true;
}

/**
 * Get all tenants a user has access to
 */
export function getUserTenants(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string
) {
  // For now, return all tenants
  // In production, this would query the user_tenants table
  return mockTenants;
}

/**
 * Extract tenant from headers (for use in API routes)
 */
export function extractTenantFromHeaders(
  headers: Headers
): TenantExtractionResult {
  const hostname = headers.get('host') || 'localhost:3000';
  const domainInfo = parseDomain(hostname);

  // Check for explicit tenant header (useful for API calls)
  const explicitTenantId = headers.get('x-tenant-id');
  if (explicitTenantId) {
    const isValidTenant = validateTenant(explicitTenantId);
    return {
      tenantId: explicitTenantId,
      isValid: isValidTenant,
      error: isValidTenant ? undefined : `Invalid tenant: ${explicitTenantId}`,
      domainInfo,
    };
  }

  // Fall back to domain-based extraction
  if (domainInfo.isLocalhost) {
    return {
      tenantId: null,
      isValid: true,
      domainInfo,
    };
  }

  if (domainInfo.isSubdomain && domainInfo.tenantId) {
    const isValidTenant = validateTenant(domainInfo.tenantId);

    return {
      tenantId: domainInfo.tenantId,
      isValid: isValidTenant,
      error: isValidTenant
        ? undefined
        : `Invalid tenant: ${domainInfo.tenantId}`,
      domainInfo,
    };
  }

  return {
    tenantId: null,
    isValid: false,
    error: 'No tenant specified',
    domainInfo,
  };
}

