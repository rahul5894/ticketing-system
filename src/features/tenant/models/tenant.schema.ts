import { z } from 'zod';

export const TenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  subdomain: z.string(),
  domain: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  settings: z
    .object({
      allowSignup: z.boolean().default(true),
      requireEmailVerification: z.boolean().default(true),
      maxUsers: z.number().optional(),
      features: z.array(z.string()).default([]),
    })
    .default({}),
});

export const TenantUserSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  role: z.enum(['admin', 'agent', 'user']),
  permissions: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Tenant = z.infer<typeof TenantSchema>;
export type TenantUser = z.infer<typeof TenantUserSchema>;

// Mock tenants for development
export const mockTenants: Tenant[] = [
  {
    id: 'quantumnest',
    name: 'QuantumNest',
    subdomain: 'quantumnest',
    domain: 'quantumnest.example.com',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    settings: {
      allowSignup: true,
      requireEmailVerification: true,
      maxUsers: 1000,
      features: ['tickets', 'analytics', 'integrations', 'sso'],
    },
  },
];

