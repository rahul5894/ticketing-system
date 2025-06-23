/**
 * Domain and subdomain utilities for multi-tenant architecture
 */

export interface DomainInfo {
  hostname: string;
  subdomain: string | null;
  isLocalhost: boolean;
  isSubdomain: boolean;
  tenantId: string | null;
}

export type DomainInfoState = DomainInfo | null;

/**
 * Extracts domain information from a hostname
 */
export function parseDomain(hostname: string): DomainInfo {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
  const isLocalhost =
    hostname.includes('localhost') || hostname.includes('127.0.0.1');

  // Handle localhost development - but check for subdomains first
  if (isLocalhost) {
    const parts = hostname.split('.');
    // Check if it's a subdomain like "quantumnest.localhost:3000"
    if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0]) {
      const subdomain = parts[0];
      return {
        hostname,
        subdomain,
        isLocalhost: true,
        isSubdomain: true,
        tenantId: subdomain,
      };
    }

    // Regular localhost without subdomain
    return {
      hostname,
      subdomain: null,
      isLocalhost: true,
      isSubdomain: false,
      tenantId: null,
    };
  }

  // Extract subdomain from hostname
  const parts = hostname.split('.');
  const rootParts = rootDomain.split('.');

  // If hostname has more parts than root domain, extract subdomain
  if (parts.length > rootParts.length) {
    const subdomain = parts.slice(0, parts.length - rootParts.length).join('.');

    return {
      hostname,
      subdomain,
      isLocalhost: false,
      isSubdomain: true,
      tenantId: subdomain, // Use subdomain as tenant ID
    };
  }

  // No subdomain detected
  return {
    hostname,
    subdomain: null,
    isLocalhost: false,
    isSubdomain: false,
    tenantId: null,
  };
}

/**
 * Validates if a tenant ID is valid
 */
export function isValidTenantId(tenantId: string | null): boolean {
  if (!tenantId) return false;

  // Basic validation: alphanumeric and hyphens only, 3-63 characters
  const tenantRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  return (
    tenantRegex.test(tenantId) && tenantId.length >= 3 && tenantId.length <= 63
  );
}

/**
 * Gets domain info from request headers (for use in middleware)
 */
export function getDomainFromRequest(request: Request): DomainInfo {
  const hostname = request.headers.get('host') || 'localhost:3000';
  return parseDomain(hostname);
}

/**
 * Gets domain info from window location (for use in client components)
 */
export function getDomainFromWindow(): DomainInfo {
  if (typeof window === 'undefined') {
    return parseDomain('localhost:3000');
  }

  // Include port for localhost development
  const hostname = window.location.port
    ? `${window.location.hostname}:${window.location.port}`
    : window.location.hostname;

  return parseDomain(hostname);
}

/**
 * Constructs a URL for a specific tenant
 */
export function getTenantUrl(tenantId: string, path: string = ''): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
  const protocol = rootDomain.includes('localhost') ? 'http' : 'https';

  if (rootDomain.includes('localhost')) {
    // For localhost, we'll use query parameters instead of subdomains
    return `${protocol}://${rootDomain}${path}?tenant=${tenantId}`;
  }

  return `${protocol}://${tenantId}.${rootDomain}${path}`;
}

/**
 * Checks if the current domain requires authentication
 */
export function requiresAuthentication(domainInfo: DomainInfo): boolean {
  // Localhost shows welcome message, subdomains require auth
  return domainInfo.isSubdomain;
}

