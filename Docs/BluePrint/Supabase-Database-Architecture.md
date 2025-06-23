# Supabase Database Architecture Document

## Support Ticketing System with Multi-Tenant Isolation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema Design](#database-schema-design)
4. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
5. [Data Flow and Relationships](#data-flow-and-relationships)
6. [Role-Based Access Control](#role-based-access-control)
7. [Scalability and Performance](#scalability-and-performance)
8. [Implementation Guidelines](#implementation-guidelines)
9. [Testing and Validation](#testing-and-validation)
10. [Migration and Deployment](#migration-and-deployment)

---

## Executive Summary

This document provides the comprehensive database architecture for a multi-tenant support ticketing system built on Supabase PostgreSQL. The architecture ensures **100% tenant isolation**, **maximum security**, and **scalable performance** while maintaining compatibility with the existing features-based folder structure.

### Key Features

- **Strict Tenant Isolation**: Row Level Security (RLS) policies prevent cross-tenant data access
- **Modular Design**: Supports the existing features-based architecture
- **Scalable Performance**: Optimized for hundreds of tenants with thousands of users
- **Security-First**: Database-level security with comprehensive access controls
- **Audit Trail**: Complete tracking of all data changes with tenant context
- **Soft Delete**: Data preservation for compliance and recovery

### Technology Stack Integration

- **Supabase PostgreSQL**: Primary database with RLS and real-time capabilities
- **Clerk Authentication**: JWT token integration with tenant claims
- **Next.js 15.3.4**: Server actions and API routes integration
- **Zustand**: Client-side state management with tenant scoping
- **Zod**: Schema validation for all database operations

---

## Architecture Overview

### Multi-Tenant Strategy

The system implements a **shared schema multi-tenancy model** where:

- All tenants share the same database schema
- Data isolation is enforced through `tenant_id` columns and RLS policies
- Each tenant operates as a completely isolated environment
- Zero data leakage between tenants is guaranteed at the database level

### Core Principles

1. **Tenant-First Design**: Every table includes mandatory `tenant_id` columns
2. **Security by Default**: RLS policies enforce isolation automatically
3. **Performance Optimization**: Indexes and queries optimized for tenant filtering
4. **Audit Compliance**: Complete change tracking with tenant context
5. **Scalable Architecture**: Designed to support hundreds of tenants

---

## Database Schema Design

### Core Tables Structure

#### 1. Tenants Table

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  domain TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT tenants_subdomain_format CHECK (subdomain ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
  CONSTRAINT tenants_subdomain_length CHECK (length(subdomain) >= 3 AND length(subdomain) <= 63)
);
```

#### 2. Users Table (Extends Clerk Users)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY, -- Matches Clerk user ID
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'agent', 'admin', 'super_admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  profile JSONB DEFAULT '{}',
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(tenant_id, email),
  CONSTRAINT users_email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);
```

#### 3. Tickets Table

```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending', 'resolved', 'escalated')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  department TEXT NOT NULL CHECK (department IN ('sales', 'support', 'marketing', 'technical')),
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  due_date TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT tickets_title_length CHECK (length(title) >= 5 AND length(title) <= 200),
  CONSTRAINT tickets_description_length CHECK (length(description) <= 5000),
  CONSTRAINT tickets_assigned_same_tenant CHECK (
    assigned_to IS NULL OR
    EXISTS (SELECT 1 FROM users WHERE id = assigned_to AND tenant_id = tickets.tenant_id)
  )
);
```

#### 4. Ticket Messages Table

```sql
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'message' CHECK (message_type IN ('message', 'note', 'system')),
  is_internal BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT ticket_messages_content_length CHECK (length(content) >= 1 AND length(content) <= 10000),
  CONSTRAINT ticket_messages_same_tenant CHECK (
    EXISTS (SELECT 1 FROM tickets WHERE id = ticket_id AND tenant_id = ticket_messages.tenant_id)
  )
);
```

#### 5. Attachments Table

```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES ticket_messages(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'ticket-attachments',
  is_public BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT attachments_file_size_limit CHECK (file_size <= 50 * 1024 * 1024), -- 50MB limit
  CONSTRAINT attachments_file_name_length CHECK (length(file_name) <= 255),
  CONSTRAINT attachments_belongs_to_ticket_or_message CHECK (
    (ticket_id IS NOT NULL AND message_id IS NULL) OR
    (ticket_id IS NULL AND message_id IS NOT NULL)
  )
);
```

#### 6. Audit Logs Table

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE')),
  actor_id UUID REFERENCES users(id),
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT audit_logs_action_values CHECK (
    (action_type = 'INSERT' AND old_values IS NULL) OR
    (action_type = 'DELETE' AND new_values IS NULL) OR
    (action_type IN ('UPDATE', 'SOFT_DELETE'))
  )
);
```

#### 7. Teams Table

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  department TEXT NOT NULL CHECK (department IN ('sales', 'support', 'marketing', 'technical')),
  lead_id UUID REFERENCES users(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(tenant_id, name),
  CONSTRAINT teams_name_length CHECK (length(name) >= 2 AND length(name) <= 100)
);
```

#### 8. Team Members Table

```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'lead', 'admin')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(team_id, user_id),
  CONSTRAINT team_members_same_tenant CHECK (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND tenant_id = team_members.tenant_id) AND
    EXISTS (SELECT 1 FROM users WHERE id = user_id AND tenant_id = team_members.tenant_id)
  )
);
```

### Indexes for Performance

```sql
-- Tenant-based indexes for optimal performance
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX idx_users_clerk_id ON users(clerk_id);

CREATE INDEX idx_tickets_tenant_id ON tickets(tenant_id);
CREATE INDEX idx_tickets_tenant_status ON tickets(tenant_id, status);
CREATE INDEX idx_tickets_tenant_priority ON tickets(tenant_id, priority);
CREATE INDEX idx_tickets_tenant_department ON tickets(tenant_id, department);
CREATE INDEX idx_tickets_tenant_created_at ON tickets(tenant_id, created_at DESC);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_tickets_created_by ON tickets(created_by);

CREATE INDEX idx_ticket_messages_tenant_id ON ticket_messages(tenant_id);
CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_created_at ON ticket_messages(created_at DESC);

CREATE INDEX idx_attachments_tenant_id ON attachments(tenant_id);
CREATE INDEX idx_attachments_ticket_id ON attachments(ticket_id) WHERE ticket_id IS NOT NULL;
CREATE INDEX idx_attachments_message_id ON attachments(message_id) WHERE message_id IS NOT NULL;

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE INDEX idx_teams_tenant_id ON teams(tenant_id);
CREATE INDEX idx_team_members_tenant_id ON team_members(tenant_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
```

---

## Row Level Security (RLS) Policies

### Enable RLS on All Tables

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
```

### Helper Functions for RLS

```sql
-- Function to get current user's tenant_id from JWT
CREATE OR REPLACE FUNCTION auth.get_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() ->> 'tenant_id')::UUID,
    (auth.jwt() ->> 'app_metadata' ->> 'tenant_id')::UUID
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's role from JWT
CREATE OR REPLACE FUNCTION auth.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    auth.jwt() ->> 'role',
    auth.jwt() ->> 'app_metadata' ->> 'role',
    'user'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.get_user_role() = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Tenants Table RLS Policies

```sql
-- Super admins can see all tenants, others can only see their own
CREATE POLICY "tenants_select_policy" ON tenants
  FOR SELECT USING (
    auth.is_super_admin() OR
    id = auth.get_tenant_id()
  );

-- Only super admins can insert new tenants
CREATE POLICY "tenants_insert_policy" ON tenants
  FOR INSERT WITH CHECK (auth.is_super_admin());

-- Only super admins can update tenants
CREATE POLICY "tenants_update_policy" ON tenants
  FOR UPDATE USING (auth.is_super_admin());

-- Only super admins can delete tenants
CREATE POLICY "tenants_delete_policy" ON tenants
  FOR DELETE USING (auth.is_super_admin());
```

### Users Table RLS Policies

```sql
-- Users can see other users in their tenant
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (
    auth.is_super_admin() OR
    tenant_id = auth.get_tenant_id()
  );

-- Only admins and super admins can insert users
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (
    auth.is_super_admin() OR
    (tenant_id = auth.get_tenant_id() AND auth.get_user_role() IN ('admin', 'super_admin'))
  );

-- Users can update their own profile, admins can update any user in their tenant
CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (
    auth.is_super_admin() OR
    (tenant_id = auth.get_tenant_id() AND (
      id = auth.uid() OR
      auth.get_user_role() IN ('admin', 'super_admin')
    ))
  );

-- Only admins and super admins can delete users
CREATE POLICY "users_delete_policy" ON users
  FOR DELETE USING (
    auth.is_super_admin() OR
    (tenant_id = auth.get_tenant_id() AND auth.get_user_role() IN ('admin', 'super_admin'))
  );
```

### Tickets Table RLS Policies

```sql
-- Users can see tickets in their tenant based on role
CREATE POLICY "tickets_select_policy" ON tickets
  FOR SELECT USING (
    auth.is_super_admin() OR
    (tenant_id = auth.get_tenant_id() AND (
      auth.get_user_role() IN ('admin', 'agent') OR
      created_by = auth.uid() OR
      assigned_to = auth.uid()
    ))
  );

-- Users can create tickets in their tenant
CREATE POLICY "tickets_insert_policy" ON tickets
  FOR INSERT WITH CHECK (
    auth.is_super_admin() OR
    (tenant_id = auth.get_tenant_id() AND created_by = auth.uid())
  );

-- Users can update tickets based on role and ownership
CREATE POLICY "tickets_update_policy" ON tickets
  FOR UPDATE USING (
    auth.is_super_admin() OR
    (tenant_id = auth.get_tenant_id() AND (
      auth.get_user_role() IN ('admin', 'agent') OR
      (created_by = auth.uid() AND status NOT IN ('closed', 'resolved'))
    ))
  );

-- Only admins can delete tickets (soft delete)
CREATE POLICY "tickets_delete_policy" ON tickets
  FOR DELETE USING (
    auth.is_super_admin() OR
    (tenant_id = auth.get_tenant_id() AND auth.get_user_role() = 'admin')
  );
```

### Ticket Messages Table RLS Policies

```sql
-- Users can see messages for tickets they have access to
CREATE POLICY "ticket_messages_select_policy" ON ticket_messages
  FOR SELECT USING (
    auth.is_super_admin() OR
    (tenant_id = auth.get_tenant_id() AND
     EXISTS (
       SELECT 1 FROM tickets t
       WHERE t.id = ticket_id
       AND (
         auth.get_user_role() IN ('admin', 'agent') OR
         t.created_by = auth.uid() OR
         t.assigned_to = auth.uid()
       )
     ))
  );

-- Users can add messages to tickets they have access to
CREATE POLICY "ticket_messages_insert_policy" ON ticket_messages
  FOR INSERT WITH CHECK (
    auth.is_super_admin() OR
    (tenant_id = auth.get_tenant_id() AND
     author_id = auth.uid() AND
     EXISTS (
       SELECT 1 FROM tickets t
       WHERE t.id = ticket_id
       AND (
         auth.get_user_role() IN ('admin', 'agent') OR
         t.created_by = auth.uid() OR
         t.assigned_to = auth.uid()
       )
     ))
  );

-- Only message authors and admins can update messages
CREATE POLICY "ticket_messages_update_policy" ON ticket_messages
  FOR UPDATE USING (
    auth.is_super_admin() OR
    (tenant_id = auth.get_tenant_id() AND (
      author_id = auth.uid() OR
      auth.get_user_role() = 'admin'
    ))
  );

-- Only admins can delete messages
CREATE POLICY "ticket_messages_delete_policy" ON ticket_messages
  FOR DELETE USING (
    auth.is_super_admin() OR
    (tenant_id = auth.get_tenant_id() AND auth.get_user_role() = 'admin')
  );
```

---

## Data Flow and Relationships

### Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Tenants   │────▶│    Users    │────▶│   Tickets   │
│             │     │             │     │             │
│ - id        │     │ - id        │     │ - id        │
│ - name      │     │ - tenant_id │     │ - tenant_id │
│ - subdomain │     │ - clerk_id  │     │ - title     │
│ - settings  │     │ - email     │     │ - status    │
└─────────────┘     │ - role      │     │ - priority  │
                    └─────────────┘     │ - created_by│
                                        │ - assigned_to│
                                        └─────────────┘
                                               │
                                               ▼
                    ┌─────────────┐     ┌─────────────┐
                    │ Attachments │     │   Messages  │
                    │             │     │             │
                    │ - id        │     │ - id        │
                    │ - tenant_id │     │ - tenant_id │
                    │ - ticket_id │     │ - ticket_id │
                    │ - file_name │     │ - content   │
                    └─────────────┘     │ - author_id │
                                        └─────────────┘
```

### Data Flow Patterns

#### 1. Ticket Creation Flow

```
User Request → Validation → Tenant Check → Create Ticket → Audit Log → Real-time Update
```

#### 2. Message Addition Flow

```
User Input → Ticket Access Check → Create Message → Update Ticket → Audit Log → Notification
```

#### 3. Status Update Flow

```
Status Change → Permission Check → Update Ticket → Audit Log → Real-time Broadcast → SLA Check
```

### Tenant Data Isolation Flow

```
JWT Token → Extract tenant_id → RLS Policy Check → Query Execution → Filtered Results
```

Every database operation follows this flow to ensure tenant isolation:

1. **Authentication**: JWT token contains tenant_id claim
2. **Authorization**: RLS policies extract tenant_id from JWT
3. **Filtering**: All queries automatically filter by tenant_id
4. **Validation**: Application layer validates tenant context
5. **Audit**: All operations logged with tenant context

---

## Role-Based Access Control

### Role Hierarchy

```
Super Admin (Cross-tenant access)
    │
    ├── Admin (Tenant-wide access)
    │   │
    │   ├── Agent (Assigned tickets + team tickets)
    │   │
    │   └── User (Own tickets only)
```

### Permission Matrix

| Action                  | User | Agent | Admin | Super Admin |
| ----------------------- | ---- | ----- | ----- | ----------- |
| View own tickets        | ✓    | ✓     | ✓     | ✓           |
| View team tickets       | ✗    | ✓     | ✓     | ✓           |
| View all tenant tickets | ✗    | ✗     | ✓     | ✓           |
| Create tickets          | ✓    | ✓     | ✓     | ✓           |
| Update ticket status    | ✗    | ✓     | ✓     | ✓           |
| Assign tickets          | ✗    | ✓     | ✓     | ✓           |
| Delete tickets          | ✗    | ✗     | ✓     | ✓           |
| Manage users            | ✗    | ✗     | ✓     | ✓           |
| Manage teams            | ✗    | ✗     | ✓     | ✓           |
| View audit logs         | ✗    | ✗     | ✓     | ✓           |
| Cross-tenant access     | ✗    | ✗     | ✗     | ✓           |

### Database-Level Role Implementation

```sql
-- Create database roles for different access levels
CREATE ROLE ticket_user;
CREATE ROLE ticket_agent;
CREATE ROLE ticket_admin;
CREATE ROLE ticket_super_admin;

-- Grant basic permissions to all roles
GRANT USAGE ON SCHEMA public TO ticket_user, ticket_agent, ticket_admin, ticket_super_admin;
GRANT SELECT ON tenants TO ticket_user, ticket_agent, ticket_admin, ticket_super_admin;

-- User role permissions
GRANT SELECT, INSERT ON tickets TO ticket_user;
GRANT SELECT, INSERT ON ticket_messages TO ticket_user;
GRANT SELECT, INSERT ON attachments TO ticket_user;

-- Agent role permissions (inherits user permissions)
GRANT ticket_user TO ticket_agent;
GRANT UPDATE ON tickets TO ticket_agent;
GRANT UPDATE ON ticket_messages TO ticket_agent;

-- Admin role permissions (inherits agent permissions)
GRANT ticket_agent TO ticket_admin;
GRANT ALL ON users, teams, team_members TO ticket_admin;
GRANT DELETE ON tickets, ticket_messages, attachments TO ticket_admin;
GRANT SELECT ON audit_logs TO ticket_admin;

-- Super admin permissions (inherits admin permissions)
GRANT ticket_admin TO ticket_super_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO ticket_super_admin;
```

---

## Scalability and Performance

### Database Optimization Strategies

#### 1. Partitioning Strategy

```sql
-- Partition audit_logs by tenant_id for better performance
CREATE TABLE audit_logs_partitioned (
  LIKE audit_logs INCLUDING ALL
) PARTITION BY HASH (tenant_id);

-- Create partitions for better distribution
CREATE TABLE audit_logs_p0 PARTITION OF audit_logs_partitioned
  FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE audit_logs_p1 PARTITION OF audit_logs_partitioned
  FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE audit_logs_p2 PARTITION OF audit_logs_partitioned
  FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE audit_logs_p3 PARTITION OF audit_logs_partitioned
  FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

#### 2. Advanced Indexing

```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_tickets_tenant_status_priority ON tickets(tenant_id, status, priority)
  WHERE status IN ('open', 'pending', 'escalated');

CREATE INDEX idx_tickets_tenant_assigned_status ON tickets(tenant_id, assigned_to, status)
  WHERE assigned_to IS NOT NULL;

-- Partial indexes for active data
CREATE INDEX idx_tickets_active ON tickets(tenant_id, created_at DESC)
  WHERE status NOT IN ('closed', 'resolved');

-- Full-text search index
CREATE INDEX idx_tickets_search ON tickets
  USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Index for real-time subscriptions
CREATE INDEX idx_tickets_updated_at ON tickets(tenant_id, updated_at DESC);
```

#### 3. Query Optimization Views

```sql
-- Materialized view for ticket statistics
CREATE MATERIALIZED VIEW ticket_stats_by_tenant AS
SELECT
  tenant_id,
  COUNT(*) as total_tickets,
  COUNT(*) FILTER (WHERE status = 'open') as open_tickets,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_tickets,
  COUNT(*) FILTER (WHERE status = 'resolved') as resolved_tickets,
  COUNT(*) FILTER (WHERE status = 'closed') as closed_tickets,
  COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_tickets,
  AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - created_at))/3600) as avg_resolution_hours
FROM tickets
GROUP BY tenant_id;

-- Refresh strategy
CREATE INDEX ON ticket_stats_by_tenant(tenant_id);
```

#### 4. Connection Pooling Configuration

```sql
-- Recommended Supabase connection settings
-- Max connections per tenant: 10-20
-- Connection timeout: 30 seconds
-- Idle timeout: 300 seconds
-- Statement timeout: 60 seconds
```

### Performance Monitoring

#### 1. Key Metrics to Track

```sql
-- Query to monitor slow queries by tenant
SELECT
  tenant_id,
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements pss
JOIN (
  SELECT DISTINCT tenant_id
  FROM tickets
  WHERE created_at > NOW() - INTERVAL '1 hour'
) t ON pss.query LIKE '%' || t.tenant_id || '%'
WHERE mean_exec_time > 1000 -- queries taking more than 1 second
ORDER BY mean_exec_time DESC;
```

#### 2. Tenant Resource Usage

```sql
-- Monitor tenant data growth
CREATE VIEW tenant_usage_stats AS
SELECT
  t.id as tenant_id,
  t.name as tenant_name,
  COUNT(DISTINCT u.id) as user_count,
  COUNT(DISTINCT tk.id) as ticket_count,
  COUNT(DISTINCT tm.id) as message_count,
  COUNT(DISTINCT a.id) as attachment_count,
  SUM(a.file_size) as total_storage_bytes,
  MAX(tk.created_at) as last_ticket_created
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id
LEFT JOIN tickets tk ON tk.tenant_id = t.id
LEFT JOIN ticket_messages tm ON tm.tenant_id = t.id
LEFT JOIN attachments a ON a.tenant_id = t.id
GROUP BY t.id, t.name;
```

### Scaling Considerations

#### 1. Horizontal Scaling Preparation

```sql
-- Prepare for read replicas
CREATE PUBLICATION tenant_data FOR TABLE
  tenants, users, tickets, ticket_messages, attachments, teams, team_members;

-- Exclude audit logs from replication (write-heavy)
CREATE PUBLICATION tenant_data_no_audit FOR TABLE
  tenants, users, tickets, ticket_messages, attachments, teams, team_members;
```

#### 2. Archive Strategy

```sql
-- Archive old closed tickets
CREATE TABLE tickets_archive (
  LIKE tickets INCLUDING ALL
);

-- Function to archive old tickets
CREATE OR REPLACE FUNCTION archive_old_tickets(days_old INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  WITH archived AS (
    DELETE FROM tickets
    WHERE status = 'closed'
    AND closed_at < NOW() - INTERVAL '1 day' * days_old
    RETURNING *
  )
  INSERT INTO tickets_archive SELECT * FROM archived;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
```

---

## Implementation Guidelines

### Phase 1: Database Setup

#### Step 1: Create Supabase Project

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize project
supabase init

# Link to your Supabase project
supabase link --project-ref your-project-ref
```

#### Step 2: Run Database Migrations

```sql
-- Create migration file: 001_initial_schema.sql
-- Copy all table creation scripts from the schema section above

-- Create migration file: 002_rls_policies.sql
-- Copy all RLS policy scripts from the RLS section above

-- Create migration file: 003_indexes_and_functions.sql
-- Copy all index and function scripts
```

#### Step 3: Configure Authentication

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Create tenant-aware client
export function createTenantClient(tenantId: string, accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Tenant-ID': tenantId,
      },
    },
  });
}
```

### Phase 2: Integration with Clerk

#### Step 1: Configure Clerk Webhooks

```typescript
// app/api/webhooks/clerk/route.ts
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env');
  }

  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as any;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', { status: 400 });
  }

  const { id, email_addresses, first_name, last_name, public_metadata } =
    evt.data;
  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const tenantId = public_metadata?.tenantId;
    const role = public_metadata?.role || 'user';

    if (!tenantId) {
      console.error('No tenant ID found in user metadata');
      return new Response('No tenant ID', { status: 400 });
    }

    const { error } = await supabase.from('users').upsert({
      id,
      tenant_id: tenantId,
      clerk_id: id,
      email: email_addresses[0]?.email_address,
      first_name,
      last_name,
      role,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error syncing user:', error);
      return new Response('Error syncing user', { status: 500 });
    }
  }

  return new Response('', { status: 200 });
}
```

#### Step 2: JWT Token Enhancement

```typescript
// lib/auth.ts
import { auth } from '@clerk/nextjs';
import { supabase } from './supabase';

export async function getAuthenticatedUser() {
  const { userId } = auth();

  if (!userId) {
    throw new Error('Not authenticated');
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', userId)
    .single();

  if (error || !user) {
    throw new Error('User not found');
  }

  return user;
}

export async function validateTenantAccess(tenantId: string) {
  const user = await getAuthenticatedUser();

  if (user.tenant_id !== tenantId) {
    throw new Error('Unauthorized tenant access');
  }

  return user;
}
```

### Phase 3: Real-time Subscriptions

#### Step 1: Configure Real-time Channels

```typescript
// lib/realtime.ts
import { supabase } from './supabase';
import { useTicketsStore } from '@/features/ticketing/store';

export function setupRealtimeSubscriptions(tenantId: string) {
  const channel = supabase
    .channel('tenant-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tickets',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        switch (eventType) {
          case 'INSERT':
            useTicketsStore.getState().addTicket(newRecord);
            break;
          case 'UPDATE':
            useTicketsStore.getState().updateTicket(newRecord.id, newRecord);
            break;
          case 'DELETE':
            useTicketsStore.getState().removeTicket(oldRecord.id);
            break;
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ticket_messages',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        const { eventType, new: newRecord } = payload;

        if (eventType === 'INSERT') {
          useTicketsStore.getState().addMessage(newRecord.ticket_id, newRecord);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
```

#### Step 2: Zustand Store Integration

```typescript
// features/ticketing/store/tickets.store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface TicketsState {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  filters: TicketFilters;
  loading: boolean;
  error: string | null;
}

interface TicketsActions {
  setTickets: (tickets: Ticket[]) => void;
  addTicket: (ticket: Ticket) => void;
  updateTicket: (id: string, updates: Partial<Ticket>) => void;
  removeTicket: (id: string) => void;
  addMessage: (ticketId: string, message: TicketMessage) => void;
  setFilters: (filters: TicketFilters) => void;
  selectTicket: (ticket: Ticket | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTicketsStore = create<TicketsState & TicketsActions>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        tickets: [],
        selectedTicket: null,
        filters: { status: 'all', priority: 'all', department: 'all' },
        loading: false,
        error: null,

        // Actions
        setTickets: (tickets) => set({ tickets }),

        addTicket: (ticket) =>
          set((state) => ({
            tickets: [ticket, ...state.tickets],
          })),

        updateTicket: (id, updates) =>
          set((state) => ({
            tickets: state.tickets.map((ticket) =>
              ticket.id === id ? { ...ticket, ...updates } : ticket
            ),
            selectedTicket:
              state.selectedTicket?.id === id
                ? { ...state.selectedTicket, ...updates }
                : state.selectedTicket,
          })),

        removeTicket: (id) =>
          set((state) => ({
            tickets: state.tickets.filter((ticket) => ticket.id !== id),
            selectedTicket:
              state.selectedTicket?.id === id ? null : state.selectedTicket,
          })),

        addMessage: (ticketId, message) =>
          set((state) => ({
            tickets: state.tickets.map((ticket) =>
              ticket.id === ticketId
                ? { ...ticket, messages: [...ticket.messages, message] }
                : ticket
            ),
            selectedTicket:
              state.selectedTicket?.id === ticketId
                ? {
                    ...state.selectedTicket,
                    messages: [...state.selectedTicket.messages, message],
                  }
                : state.selectedTicket,
          })),

        setFilters: (filters) => set({ filters }),
        selectTicket: (selectedTicket) => set({ selectedTicket }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
      }),
      {
        name: 'tickets-store',
        partialize: (state) => ({
          filters: state.filters,
          selectedTicket: state.selectedTicket,
        }),
      }
    ),
    { name: 'tickets-store' }
  )
);
```

### Phase 4: API Integration

#### Step 1: Server Actions

```typescript
// features/ticketing/api/tickets.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { validateTenantAccess } from '@/lib/auth';
import { TicketSchema } from '../models/ticket.schema';

export async function createTicket(formData: FormData) {
  try {
    const tenantId = formData.get('tenantId') as string;
    const user = await validateTenantAccess(tenantId);

    const ticketData = {
      tenant_id: tenantId,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      priority: formData.get('priority') as string,
      department: formData.get('department') as string,
      created_by: user.id,
    };

    // Validate with Zod
    const validatedData = TicketSchema.omit({
      id: true,
      created_at: true,
      updated_at: true,
    }).parse(ticketData);

    const { data, error } = await supabase
      .from('tickets')
      .insert(validatedData)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/tickets');
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updateTicketStatus(
  ticketId: string,
  status: string,
  tenantId: string
) {
  try {
    await validateTenantAccess(tenantId);

    const { data, error } = await supabase
      .from('tickets')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(status === 'resolved' && { resolved_at: new Date().toISOString() }),
        ...(status === 'closed' && { closed_at: new Date().toISOString() }),
      })
      .eq('id', ticketId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/tickets');
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

#### Step 2: API Routes

```typescript
// app/api/tickets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateTenantAccess } from '@/lib/auth';
import { z } from 'zod';

const GetTicketsSchema = z.object({
  tenantId: z.string().uuid(),
  status: z.string().optional(),
  priority: z.string().optional(),
  department: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = GetTicketsSchema.parse(Object.fromEntries(searchParams));

    await validateTenantAccess(params.tenantId);

    let query = supabase
      .from('tickets')
      .select(
        `
        *,
        created_by:users!tickets_created_by_fkey(id, email, first_name, last_name),
        assigned_to:users!tickets_assigned_to_fkey(id, email, first_name, last_name)
      `
      )
      .eq('tenant_id', params.tenantId);

    // Apply filters
    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }
    if (params.priority && params.priority !== 'all') {
      query = query.eq('priority', params.priority);
    }
    if (params.department && params.department !== 'all') {
      query = query.eq('department', params.department);
    }

    // Apply pagination
    const from = (params.page - 1) * params.limit;
    const to = from + params.limit - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({
      tickets: data,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / params.limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

---

## Testing and Validation

### Database Testing

#### 1. RLS Policy Testing

```sql
-- Test tenant isolation
SET request.jwt.claim.tenant_id = 'tenant-1-uuid';
SELECT * FROM tickets; -- Should only return tenant-1 tickets

SET request.jwt.claim.tenant_id = 'tenant-2-uuid';
SELECT * FROM tickets; -- Should only return tenant-2 tickets

-- Test role-based access
SET request.jwt.claim.role = 'user';
SET request.jwt.claim.sub = 'user-1-uuid';
SELECT * FROM tickets; -- Should only return user's own tickets

SET request.jwt.claim.role = 'admin';
SELECT * FROM tickets; -- Should return all tenant tickets
```

#### 2. Performance Testing

```sql
-- Test query performance with large datasets
EXPLAIN ANALYZE
SELECT * FROM tickets
WHERE tenant_id = 'test-tenant-uuid'
AND status = 'open'
ORDER BY created_at DESC
LIMIT 20;

-- Should use index: idx_tickets_tenant_status_created
```

### Integration Testing

#### 1. Clerk Webhook Testing

```typescript
// tests/webhooks/clerk.test.ts
import { POST } from '@/app/api/webhooks/clerk/route';

describe('Clerk Webhook', () => {
  it('should create user on user.created event', async () => {
    const mockRequest = new Request(
      'http://localhost:3000/api/webhooks/clerk',
      {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify({
          type: 'user.created',
          data: {
            id: 'user_123',
            email_addresses: [{ email_address: 'test@example.com' }],
            first_name: 'Test',
            last_name: 'User',
            public_metadata: {
              tenantId: 'tenant-123',
              role: 'user',
            },
          },
        }),
      }
    );

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
  });
});
```

#### 2. API Route Testing

```typescript
// tests/api/tickets.test.ts
import { GET } from '@/app/api/tickets/route';

describe('Tickets API', () => {
  it('should return tickets for authenticated tenant', async () => {
    const request = new Request(
      'http://localhost:3000/api/tickets?tenantId=test-tenant&status=open'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tickets).toBeDefined();
    expect(data.pagination).toBeDefined();
  });
});
```

### Security Testing

#### 1. Tenant Isolation Validation

```typescript
// tests/security/tenant-isolation.test.ts
describe('Tenant Isolation', () => {
  it('should prevent cross-tenant data access', async () => {
    // Attempt to access another tenant's data
    const response = await fetch('/api/tickets', {
      headers: {
        Authorization: 'Bearer tenant-1-token',
      },
    });

    const data = await response.json();

    // Verify no tenant-2 data is returned
    expect(
      data.tickets.every((ticket) => ticket.tenant_id === 'tenant-1-uuid')
    ).toBe(true);
  });
});
```

---

## Migration and Deployment

### Database Migration Strategy

#### 1. Migration Files Structure

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_rls_policies.sql
│   ├── 003_indexes_and_functions.sql
│   ├── 004_audit_triggers.sql
│   └── 005_performance_optimizations.sql
├── seed.sql
└── config.toml
```

#### 2. Deployment Checklist

```bash
# 1. Backup existing database
supabase db dump --file backup-$(date +%Y%m%d).sql

# 2. Run migrations
supabase db push

# 3. Verify RLS policies
supabase db test

# 4. Run performance tests
supabase db benchmark

# 5. Update environment variables
# 6. Deploy application
# 7. Monitor for issues
```

### Production Deployment

#### 1. Environment Configuration

```bash
# Production environment variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLERK_SECRET_KEY=your-clerk-secret
CLERK_WEBHOOK_SECRET=your-webhook-secret
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
```

#### 2. Monitoring Setup

```typescript
// lib/monitoring.ts
import { createClient } from '@supabase/supabase-js';

export function setupDatabaseMonitoring() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Monitor slow queries
  setInterval(async () => {
    const { data } = await supabase
      .from('pg_stat_statements')
      .select('query, mean_exec_time, calls')
      .gt('mean_exec_time', 1000)
      .order('mean_exec_time', { ascending: false })
      .limit(10);

    if (data && data.length > 0) {
      console.warn('Slow queries detected:', data);
      // Send to monitoring service
    }
  }, 60000); // Check every minute
}
```

---

## Conclusion

This Supabase Database Architecture Document provides a comprehensive foundation for implementing a secure, scalable, and performant multi-tenant support ticketing system. The architecture ensures:

- **100% Tenant Isolation** through RLS policies and application-level validation
- **Scalable Performance** with optimized indexes and query patterns
- **Security-First Design** with role-based access control and audit logging
- **Production-Ready Implementation** with detailed migration and deployment strategies

The modular design supports the existing features-based folder structure while providing flexibility for future enhancements and scaling requirements.

### Next Steps

1. **Implement Phase 1**: Set up the database schema and RLS policies
2. **Configure Authentication**: Integrate Clerk webhooks and JWT handling
3. **Build API Layer**: Implement server actions and API routes
4. **Add Real-time Features**: Configure Supabase subscriptions
5. **Test Thoroughly**: Validate security, performance, and functionality
6. **Deploy to Production**: Follow the deployment checklist and monitoring setup

This architecture serves as the definitive guide for the Supabase backend implementation, ensuring a robust and maintainable foundation for the support ticketing system.

