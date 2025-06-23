Understood — you want a detailed, comprehensive rewrite of **SimpleDoc** exactly like the style and depth you attached, but now incorporating **tenant-based system** and **full tenant isolation** properly, part by part.

I’ll replicate the thoroughness of your original **SimpleDoc** but upgrade it fully with tenancy details, isolation, and soft delete.

I will start with **Part 1: System Architecture & Project Setup with Tenant Isolation** in a detailed way, matching the style of your SimpleDoc, focusing on your exact architecture and modular monolith, clearly explaining how tenant isolation integrates deeply.

---

# SimpleDoc — Part 1: System Architecture & Project Setup with Tenant Isolation

---

## 1. Introduction to Architecture

Your ticketing system is designed as a **Domain-Driven Modular Monolith**:

- The entire application is a **single deployable unit**, simplifying deployment and operations.
- Internally, the codebase is organized into **domains** such as `auth`, `ticketing`, `teams`, and `notifications`, allowing clear separation of concerns.
- This modular domain structure facilitates scalability, maintainability, and enables teams to work independently on domains.
- The monolithic approach allows shared database and code resources while maintaining modular boundaries.

---

## 2. Tenant-Based Multi-Tenancy

The system supports **multi-tenancy** — multiple independent tenants (organizations or clients) operate securely on the same system instance.

- **Tenant Isolation** is a core principle: each tenant’s data is logically and physically isolated to prevent unauthorized cross-access.
- The system uses a **shared schema multi-tenancy approach**:
  A single database schema holds data for all tenants, distinguished by a `tenant_id` in every relevant table.
- This approach enables easy onboarding of new tenants without complex database migrations or schema changes.

---

## 3. Tenant Isolation Implementation

### 3.1 Tenant Context in Data Model

- Every relevant table in your database includes a `tenant_id` UUID column, linking data rows to their owning tenant.
- Examples include:

| Table        | Key Tenant Column |
| ------------ | ----------------- |
| `users`      | `tenant_id`       |
| `tickets`    | `tenant_id`       |
| `responses`  | `tenant_id`       |
| `audit_logs` | `tenant_id`       |

### 3.2 Row Level Security (RLS)

- **Supabase PostgreSQL Row Level Security policies** enforce tenant isolation at the database level:

  - RLS policies filter rows to only those where `tenant_id` matches the authenticated user’s tenant.
  - Even if application bugs occur, the DB prevents cross-tenant data exposure.

- RLS policies are defined per table, e.g.:

```sql
CREATE POLICY "Tenant isolation policy" ON tickets
  USING (tenant_id = current_setting('request.jwt.claim.tenant_id')::uuid);
```

- JWT claims issued on authentication include the tenant ID, which the DB reads to apply policies.

### 3.3 Tenant Context in Authentication

- User authentication is managed by Clerk.
- Upon login, your backend syncs Clerk user info with your `users` table, including the user’s `tenant_id`.
- Your backend generates JWT tokens embedding the user’s tenant ID as a claim.
- All API calls use this tenant-aware JWT for authorization and data filtering.

---

## 4. Application Flow with Tenant Awareness

- On login, the frontend stores user info including `tenant_id`.
- Every client request or server action sends the user's JWT token with embedded `tenant_id`.
- Backend services extract the `tenant_id` from the token and enforce it in queries.
- Zustand stores frontend state scoped to the current tenant.
- Tickets, responses, users, and audit logs queries filter by `tenant_id` — enforced both by backend logic and RLS.
- This flow ensures **0% tenant data leakage**.

---

## 5. Technology Stack Roles in Tenant Context

| Technology         | Role with Tenant Awareness                                                   |
| ------------------ | ---------------------------------------------------------------------------- |
| **Next.js 15.3.4** | Frontend + backend server actions handle tenant-aware routing and API calls. |
| **React 19.1.0**   | UI dynamically renders tenant-scoped data.                                   |
| **Clerk**          | Authenticates users and manages tenant-linked user identities.               |
| **Supabase**       | Database with RLS policies enforces tenant isolation.                        |
| **Zustand**        | Holds tenant-scoped client state (user info, tickets).                       |
| **Zod**            | Validates tenant-aware API input data.                                       |
| **Tailwind CSS**   | Styles UI consistently across tenants.                                       |

---

## 6. Checklist for Tenant-Aware Setup

- [ ] Add `tenant_id` columns to all business-critical tables.
- [ ] Implement Supabase RLS policies on all tenant-scoped tables.
- [ ] Ensure Clerk sync process associates users with tenants.
- [ ] Generate JWT tokens embedding tenant ID claim.
- [ ] Modify backend API/server actions to extract and enforce tenant ID.
- [ ] Scope frontend state and queries by tenant ID.
- [ ] Write Zod schemas to validate tenant-bound data inputs.

---

## 7. Summary

By implementing **tenant-based multi-tenancy with strict tenant isolation using Supabase RLS and Clerk-authenticated tokens**, your ticketing system:

- Protects tenant data integrity and privacy.
- Enables scalable multi-tenant operations without schema duplication.
- Keeps the modular monolith architecture clean and maintainable.
- Lays a secure foundation for onboarding thousands of tenants easily.

---

# SimpleDoc — Part 2: User Management, Authentication & Tenant-Aware Session Flow

---

## 1. Role of Clerk in User Authentication & Tenant Binding

- **Clerk** manages user sign-up, sign-in, session management, and identity verification.
- Upon user registration or login, Clerk issues a **secure JWT token** embedding user identity data.
- The system extends this process by associating each user with a **specific tenant** (organization).
- This association happens during user onboarding or via admin assignment.

---

## 2. Syncing Clerk Users with Tenant Data in Supabase

- On first user login, the backend creates or updates a corresponding record in the `users` table with fields:

  - `id` (UUID primary key)
  - `tenant_id` (UUID foreign key linking user to their tenant)
  - `clerk_id` (Clerk’s unique user ID)
  - `email`, `name`, `role` (e.g., user, agent, admin)
  - `created_at`, `updated_at`

- This mapping ties Clerk identities directly to tenant contexts.

- All application logic then references this `tenant_id` for enforcing isolation.

---

## 3. Tenant-Aware JWT Tokens and Claims

- When users authenticate, the backend issues JWT tokens embedding tenant information as a claim, for example:

  ```json
  {
    "sub": "user-uuid",
    "tenant_id": "tenant-uuid",
    "role": "agent",
    "iat": 1234567890,
    "exp": 1234567890
  }
  ```

- These tokens are passed to Supabase and backend services.

- Supabase RLS policies read the `tenant_id` claim to filter access to tenant-specific rows automatically.

- Backend APIs validate tokens and extract tenant ID to scope all queries and mutations.

---

## 4. Authentication Flow in Next.js Frontend

- The frontend uses Clerk’s React components and hooks for UI flows:

  - `<SignIn />` and `<SignUp />` components for login and registration.
  - `useUser()` hook to access current user info and session data, including tenant ID.

- Upon authentication, the frontend stores tenant-aware user info in Zustand state.

- Every API request or server action includes the user’s JWT token with tenant claim.

- The frontend restricts UI actions and data views based on user role and tenant membership.

---

## 5. Role-Based Access Control (RBAC) with Tenant Context

- User roles define their permissions within their tenant:

  | Role           | Permissions                                          |
  | -------------- | ---------------------------------------------------- |
  | **User**       | Create tickets, respond to their own tickets         |
  | **Agent**      | View & update tickets assigned to their tenant/team  |
  | **Admin**      | Manage users & tickets, assign tickets within tenant |
  | **SuperAdmin** | Full control across all tenants (optional)           |

- Roles are stored in the `users` table and reflected in JWT claims.

- UI and backend logic enforce role-based restrictions scoped by tenant.

---

## 6. Tenant-Aware Session Management

- Clerk manages token refresh and session expiration automatically.
- Backend verifies JWT tokens on each request, ensuring tenant claims are valid and active.
- If token tenant does not match requested data’s tenant, access is denied.
- Session stores tenant ID to avoid repeated lookups, improving performance and security.

---

## 7. Synchronizing User State and Tenant Info with Zustand

- The frontend Zustand store maintains:

  - Current authenticated user info (`id`, `email`, `role`, `tenant_id`).
  - Tenant-scoped tickets and resources fetched from backend.

- This store ensures components reactively update based on tenant-aware data changes.

- Zustand selectors apply shallow comparison to optimize re-renders.

---

## 8. Security and Best Practices

- Never expose tenant IDs or sensitive claims in insecure contexts (e.g., logs).
- Validate all user inputs with Zod schemas, including tenant-scoped identifiers.
- Backend API endpoints enforce tenant verification on all inputs.
- Use HTTPS everywhere and ensure Clerk tokens are securely stored and transmitted.

---

## 9. Summary Checklist for Tenant-Aware User Management

- [ ] Integrate Clerk’s authentication UI components with Next.js frontend.
- [ ] Sync Clerk user data with Supabase `users` table, including tenant ID.
- [ ] Issue JWT tokens embedding tenant and role claims.
- [ ] Implement Supabase RLS policies using tenant_id claims.
- [ ] Manage tenant and user state reactively in frontend Zustand stores.
- [ ] Enforce role-based access control scoped to tenant boundaries.
- [ ] Validate all API inputs with Zod to include tenant constraints.

---

# SimpleDoc — Part 3: Tenant-Aware Ticket Data Modeling & State Management

---

## 1. Database Schema Design with Tenant Awareness

To enforce tenant isolation and support multi-tenancy, every table relevant to tickets and related data includes a `tenant_id` column (UUID), linking records to their owning tenant.

### Key Tables and Fields:

| Table          | Important Fields                                                                                                                                | Notes                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **users**      | `id`, `tenant_id`, `clerk_id`, `email`, `role`                                                                                                  | Maps Clerk users to tenants and roles      |
| **tickets**    | `id`, `tenant_id`, `user_id`, `subject`, `description`, `priority`, `category`, `status`, `deadline`, `assigned_to`, `created_at`, `updated_at` | Ticket core data; all tenant-scoped        |
| **responses**  | `id`, `tenant_id`, `ticket_id`, `user_id`, `message`, `created_at`                                                                              | Ticket conversation threads, tenant-scoped |
| **audit_logs** | `id`, `tenant_id`, `ticket_id`, `user_id`, `action_type`, `old_value`, `new_value`, `timestamp`                                                 | Tracks all changes with tenant context     |

---

## 2. Zod Schemas for Tenant-Aware Validation

Use **Zod** schemas to ensure all inputs are validated and include tenant context where necessary.

Example: Ticket creation schema

```ts
import { z } from 'zod';

export const createTicketSchema = z.object({
  tenant_id: z.string().uuid(), // tenant must be explicitly provided and valid
  user_id: z.string().uuid(),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  description: z.string().min(10, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.string().optional(),
});
```

- Always validate tenant IDs and user IDs on all inputs to prevent cross-tenant injection.

---

## 3. Zustand State Management Scoped by Tenant

### Store Structure

- Maintain a global store that keeps tickets and responses filtered by the current tenant.

Example state slice:

```ts
const useTicketStore = create((set) => ({
  tenant_id: null,
  tickets: [],
  responses: {},
  setTenant: (tenantId) => set({ tenant_id: tenantId }),
  setTickets: (tickets) => set({ tickets }),
  addResponse: (ticketId, response) =>
    set((state) => ({
      responses: {
        ...state.responses,
        [ticketId]: [...(state.responses[ticketId] || []), response],
      },
    })),
}));
```

### Benefits

- Ensures UI reacts only to tenant-scoped data changes.
- Avoids accidental mixing of tickets from different tenants.
- Allows clear state reset on tenant switch or logout.

---

## 4. Backend Data Access with Tenant Enforcement

- All server actions and API endpoints:

  - Extract `tenant_id` from the authenticated user's JWT token.
  - Use `tenant_id` in all queries as a mandatory filter.
  - Prevent access to data belonging to other tenants.

Example SQL-like pseudo code for fetching tickets:

```sql
SELECT * FROM tickets
WHERE tenant_id = current_user_tenant_id
  AND (user_id = current_user_id OR assigned_to = current_user_id);
```

- Updates and deletes similarly use tenant-aware filtering.

---

## 5. Real-Time Updates via Supabase

- Supabase real-time subscriptions listen on tables filtered by `tenant_id`.
- Frontend subscribes to ticket and response changes **only for the current tenant**.
- This ensures real-time sync of tenant-specific data with zero leakage.

---

## 6. Soft Delete Support in Data Modeling

- Tickets are **never hard deleted**.
- Instead, tickets have a `status` field which can be set to `closed` to indicate soft deletion.
- The UI filters out closed tickets from active views but retains them in the database for audit and potential restore.
- Responses linked to tickets remain to preserve conversation history.

---

## 7. Summary Checklist for Tenant-Aware Data Modeling

- [ ] Add `tenant_id` to all relevant tables and enforce UUID format.
- [ ] Define Zod schemas that require and validate tenant IDs on inputs.
- [ ] Implement Zustand stores scoped to current tenant ID.
- [ ] Ensure backend queries always filter by authenticated user's tenant ID.
- [ ] Use Supabase real-time subscriptions filtered by tenant.
- [ ] Implement soft delete via status changes, not physical deletion.

---

# SimpleDoc — Part 4: Tenant-Aware Ticket Lifecycle & Soft Delete Management

---

## 1. Ticket Status Definitions with Tenant Awareness

Each ticket moves through a clearly defined lifecycle within its tenant context:

| Status        | Description                                                          |
| ------------- | -------------------------------------------------------------------- |
| **New**       | Ticket just created and awaiting assignment within tenant.           |
| **Open**      | Actively being worked on by tenant’s support agents.                 |
| **Pending**   | Awaiting user input or additional information from tenant users.     |
| **Resolved**  | Support believes issue is fixed, awaiting tenant user confirmation.  |
| **Closed**    | Ticket is finalized and archived (soft deleted), no further actions. |
| **Escalated** | Urgent ticket requiring immediate attention within the tenant.       |

---

## 2. Status Transitions & Business Rules

- Status transitions are **always scoped to tenant data** via `tenant_id`.
- Example flows:

  - `New → Open` when tenant’s agent picks up the ticket.
  - `Open → Pending` when awaiting tenant user response.
  - `Pending → Open` when tenant user provides info.
  - `Open → Resolved` when issue fixed.
  - `Resolved → Closed` after tenant user confirms or timeout.
  - Any status can move to `Escalated` due to SLA breaches.

---

## 3. Soft Delete Implementation (Closed Tickets)

- Tickets are **never physically deleted** to ensure audit and compliance.

- Instead, when a tenant user or admin “deletes” a ticket, the ticket’s status is changed to `Closed`.

- Tickets with status `Closed` are:

  - Hidden from all active ticket views by default.
  - Moved into a dedicated **Closed Tickets folder** or archive accessible by tenant admins.
  - Retained in the database for audit logs, reporting, and possible restoration.

- Responses linked to closed tickets remain intact for history.

---

## 4. Soft Delete Workflow in the Application

- UI components show active tickets filtered with `status != Closed`.
- Closed tickets are accessible under an “Archived Tickets” section for tenant admins and agents with permission.
- Tenant users cannot recover closed tickets unless an admin performs a restoration action.
- Restoration changes the ticket status from `Closed` back to a prior active status (e.g., `Open` or `Pending`).

---

## 5. Tenant-Aware Audit Logging for Lifecycle Changes

- Every status change, including soft delete (close), is recorded in `audit_logs` with tenant context:

| Field         | Description                             |
| ------------- | --------------------------------------- |
| `tenant_id`   | Tenant owning the ticket                |
| `ticket_id`   | Ticket affected                         |
| `user_id`     | User who made the change                |
| `action_type` | Example: "status_change", "soft_delete" |
| `old_value`   | Previous status                         |
| `new_value`   | New status (`Closed` for soft delete)   |
| `timestamp`   | When the change occurred                |

- Audit logs provide full traceability within tenant boundaries.

---

## 6. Automation & SLA Enforcement

- Scheduled jobs (e.g., Supabase Edge Functions) run tenant-aware checks for SLA deadlines.
- Tickets overdue for response or resolution trigger status escalations within their tenant.
- These escalations respect tenant boundaries and notify only relevant tenant users.

---

## 7. Security Considerations

- All lifecycle transitions and soft delete operations verify tenant ownership before proceeding.
- Backend APIs reject any operation where the authenticated user's tenant does not match the ticket’s tenant.
- UI components enforce role and tenant-based permissions for visibility and actions.

---

## 8. Summary Checklist for Ticket Lifecycle & Soft Delete

- [ ] Define ticket statuses including `Closed` for soft delete.
- [ ] Implement status transitions scoped to tenant data (`tenant_id`).
- [ ] Soft delete tickets by setting status to `Closed`, not physical deletion.
- [ ] Provide UI views for active vs. archived tickets per tenant.
- [ ] Log all status changes including soft deletes in tenant-aware audit logs.
- [ ] Automate SLA-based escalations respecting tenant boundaries.
- [ ] Enforce tenant ownership checks on all lifecycle operations.

---

# SimpleDoc — Part 5: Tenant-Aware State Management, API Design & Security

---

## 1. Frontend State Management with Tenant Context

- Use **Zustand** for global state, carefully scoped to the authenticated user's **tenant_id**.
- The store holds tenant-specific data such as tickets, responses, user info, and UI state.
- Example structure:

```ts
const useTenantStore = create((set) => ({
  tenant_id: null,
  currentUser: null,
  tickets: [],
  setTenant: (tenantId) => set({ tenant_id: tenantId }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setTickets: (tickets) => set({ tickets }),
  clearState: () => set({ tenant_id: null, currentUser: null, tickets: [] }),
}));
```

- This ensures the UI reacts only to the tenant’s data, preventing cross-tenant data mix-up.

---

## 2. API and Server Actions Design

- All API endpoints and Next.js server actions must:

  - Extract the tenant ID from the authenticated user's JWT token.
  - Use tenant ID as a **mandatory filter** on all database queries and mutations.
  - Reject requests if tenant ID in token and request payload do not match.
  - Use Zod schemas for validating all inputs, including tenant IDs and UUIDs.

- Typical API responsibilities include:

  - Creating tickets scoped to tenant.
  - Updating ticket statuses and priorities.
  - Adding responses to tickets.
  - Fetching tickets and related data filtered by tenant.
  - Handling soft deletes (marking tickets as closed).

---

## 3. Supabase Row Level Security (RLS) Enforcement

- Supabase enforces tenant isolation via RLS policies on every relevant table.
- Example RLS policy for `tickets` table:

```sql
CREATE POLICY tenant_isolation ON tickets
  USING (tenant_id = current_setting('request.jwt.claim.tenant_id')::uuid);
```

- JWT tokens must include `tenant_id` as a claim, used by RLS to filter accessible rows.
- This setup prevents any query or mutation that tries to access data outside the tenant scope.

---

## 4. Security Best Practices

- Verify all incoming requests to ensure:

  - Valid and unexpired JWT tokens.
  - The tenant ID in JWT matches the tenant ID in the request context.
  - User roles permit the requested action within the tenant.

- Protect sensitive endpoints with role-based checks (e.g., only admins can close tickets or view audit logs).

- Use HTTPS exclusively to secure token transmission.

- Avoid exposing tenant IDs or sensitive claims in logs or error messages.

---

## 5. Input Validation with Zod

- Use Zod schemas extensively to:

  - Validate ticket creation/update payloads.
  - Confirm tenant IDs, user IDs, and ticket IDs are valid UUIDs.
  - Enforce required fields and correct data types.

- Example schema for ticket update:

```ts
const updateTicketSchema = z.object({
  tenant_id: z.string().uuid(),
  ticket_id: z.string().uuid(),
  status: z.enum(['new', 'open', 'pending', 'resolved', 'closed', 'escalated']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});
```

- This prevents invalid or malicious data from entering the system.

---

## 6. Error Handling and Monitoring

- Implement centralized error handling to:

  - Capture and log unexpected errors with tenant context.
  - Return sanitized, user-friendly error messages without leaking internal details.

- Monitor API usage, failed requests, and unusual patterns per tenant to detect abuse or issues.

- Audit logs include errors affecting ticket lifecycle or user access.

---

## 7. Summary Checklist for State, API & Security

- [ ] Use Zustand to hold tenant-scoped frontend state.
- [ ] Design API and server actions that require tenant ID and validate it on every call.
- [ ] Implement strict Supabase RLS policies filtering by tenant ID from JWT claims.
- [ ] Validate all inputs with Zod, including tenant-scoped UUIDs.
- [ ] Enforce role-based access control in backend.
- [ ] Use HTTPS and secure token storage/transmission.
- [ ] Centralize error handling with tenant-aware logging and monitoring.
