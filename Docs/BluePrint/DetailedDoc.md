# DetailedDoc — Part 1: System Architecture & Project Setup with Tenant Isolation

---

## 1. Introduction to Architecture

Your ticketing system is architected as a **Domain-Driven Modular Monolith**. This design principle entails:

- A **single deployable application** encompassing all business capabilities.
- Internally structured into **modular domains** such as `auth`, `ticketing`, `notifications`, `teams`, and `audit`.
- Each domain contains UI components, models, business logic (services), and state management (e.g., Zustand stores).
- This modular approach fosters maintainability, independent domain scaling, and clear separation of concerns.

---

## 2. Tenant-Based Multi-Tenancy Overview

The system supports **true multi-tenancy** with full data isolation for thousands of tenants:

- Tenants represent separate organizations or clients using the system simultaneously.
- Each tenant’s data is **strictly isolated**, ensuring **zero data leakage** between tenants.
- A **shared schema multi-tenancy model** is implemented, where all tenant data coexists in the same database schema but is logically separated by `tenant_id`.
- Tenant isolation is enforced both at the **application layer** and at the **database layer** using Supabase Row Level Security (RLS).

---

## 3. Database Tenant Isolation Strategy

### 3.1 Tenant Identifier

- Every table containing tenant-specific data has a mandatory `tenant_id` UUID column.
- This column acts as a foreign key linking data to the tenant owning it.

### 3.2 Tenant Scope in Tables

Tables include:

| Table        | Tenant Field | Description                    |
| ------------ | ------------ | ------------------------------ |
| `users`      | `tenant_id`  | Tenant owning the user         |
| `tickets`    | `tenant_id`  | Tenant owning the ticket       |
| `responses`  | `tenant_id`  | Tenant owning ticket responses |
| `audit_logs` | `tenant_id`  | Tenant owning audit entries    |
| `teams`      | `tenant_id`  | Tenant owning support teams    |

### 3.3 Row Level Security (RLS)

- For each tenant-scoped table, a **Supabase RLS policy** restricts access to rows matching the tenant ID in the JWT token.

Example RLS policy snippet:

```sql
CREATE POLICY "Tenant row access" ON tickets
USING (tenant_id = current_setting('request.jwt.claim.tenant_id')::uuid);
```

- The JWT tokens issued at authentication embed the `tenant_id` claim, which PostgreSQL leverages to enforce this policy.

---

## 4. Authentication and Tenant Context

- User authentication is managed via **Clerk**.
- On user signup or login, the backend synchronizes the user data into the `users` table, associating the user with a specific `tenant_id`.
- Authentication tokens issued to the frontend include this tenant ID as a JWT claim.
- All requests to backend services carry this token, enabling secure tenant-aware access.

---

## 5. Application Data Flow with Tenant Awareness

- Upon login, the frontend stores the user’s `tenant_id` securely.
- All API requests or server actions include the user’s token carrying tenant info.
- Backend services extract tenant context from the token and enforce tenant scoping in queries and mutations.
- Zustand stores are scoped by tenant to hold user and ticket data isolated by tenant.
- Supabase’s real-time subscription mechanism respects tenant boundaries through RLS, pushing updates only for the tenant’s data.

---

## 6. Technology Stack Roles (Tenant-Aware)

| Technology         | Role with Tenant Awareness                                                       |
| ------------------ | -------------------------------------------------------------------------------- |
| **Next.js 15.3.4** | Frontend and backend server actions implementing tenant-scoped APIs and routing. |
| **React 19.1.0**   | UI rendering tenant-scoped data reactively.                                      |
| **Clerk**          | Authentication and tenant-aware identity management.                             |
| **Supabase**       | Database with RLS policies enforcing strict tenant isolation.                    |
| **Zustand**        | Client-side tenant-scoped state management.                                      |
| **Zod**            | Schema validation enforcing tenant-aware data correctness.                       |
| **Tailwind CSS**   | Responsive and consistent UI styling across tenants.                             |

---

## 7. Project Setup Checklist

- [ ] Define and add `tenant_id` columns in all tenant-scoped tables.
- [ ] Create and test Supabase RLS policies per table for tenant enforcement.
- [ ] Integrate Clerk to assign users to tenants and embed tenant claims in tokens.
- [ ] Implement backend APIs/server actions that extract tenant ID from tokens and enforce tenant scoping.
- [ ] Scope frontend state management via Zustand to tenant data only.
- [ ] Validate tenant-aware inputs with Zod schemas.
- [ ] Setup Supabase realtime subscriptions filtered by tenant ID.

---

## 8. Summary

This tenant-aware modular monolith architecture provides:

- **Robust tenant isolation** at the DB and application layers.
- Scalability for thousands of tenants on shared infrastructure.
- Maintainability through domain modularization.
- Security and compliance readiness through strong access controls.

---

# DetailedDoc — Part 2: User Management & Tenant-Aware Authentication Workflow

---

## 1. User Management Overview

- Users are the primary actors interacting with the system, each linked to a specific tenant.
- User roles define permissions within their tenant scope:

  - **User**: Can create and view their own tickets.
  - **Agent**: Supports ticket handling within their tenant.
  - **Admin**: Manages users, tickets, and teams within the tenant.
  - **Super Admin**: (Optional) Has cross-tenant administrative privileges.

---

## 2. Authentication Flow with Clerk

- Clerk provides secure authentication including sign-up, sign-in, password management, and session handling.
- On successful authentication, Clerk issues JWT tokens embedding the user’s identity.
- Your backend synchronizes Clerk users with the Supabase `users` table, associating each user with a tenant ID and role.
- Tenant ID is included as a custom claim in the JWT token.

---

## 3. Tenant-Aware JWT Tokens & Claims

- JWT tokens issued upon authentication contain:

  - `sub`: Unique user ID.
  - `tenant_id`: UUID representing the user’s tenant.
  - `role`: User’s role within tenant.
  - Standard claims (`iat`, `exp`, etc.).

- Backend and Supabase use these claims for authorization and Row Level Security.

---

## 4. User Synchronization Between Clerk and Supabase

- On user login or registration:

  - Check if user exists in `users` table by Clerk ID.
  - If new, create user with associated `tenant_id` and role.
  - If existing, update user metadata if necessary.

- This ensures your backend maintains an authoritative tenant-aware user record.

---

## 5. Role-Based Access Control (RBAC) within Tenant

- Role definitions enforce permission boundaries scoped by tenant:

| Role        | Permissions                                                   |
| ----------- | ------------------------------------------------------------- |
| User        | Create tickets, view own tickets, respond to assigned tickets |
| Agent       | Manage tickets assigned to tenant/team, update statuses       |
| Admin       | Assign tickets, manage users and teams within tenant          |
| Super Admin | Full system access across tenants (use cautiously)            |

- RBAC is enforced at the backend and frontend UI to restrict actions and data access appropriately.

---

## 6. Frontend Tenant-Aware Session Management

- Frontend uses Clerk React components and hooks:

  - `<SignIn />`, `<SignUp />` components for auth flows.
  - `useUser()` hook to retrieve current user session and metadata including tenant ID and role.

- Tenant info is stored in Zustand store for reactive UI rendering and data fetching.

- All API calls include the user’s JWT token with tenant claims for authorization.

---

## 7. Security Considerations

- Verify JWT tokens on every backend request.
- Reject any request where the token’s `tenant_id` does not match the resource’s tenant.
- Prevent token forgery by validating token signatures and expiration.
- Limit scope of `Super Admin` role to trusted personnel.

---

## 8. Summary Checklist for Tenant-Aware User Management

- [ ] Integrate Clerk for user authentication with React UI components.
- [ ] Sync Clerk users to Supabase `users` table including `tenant_id` and `role`.
- [ ] Issue JWT tokens embedding tenant ID and roles as claims.
- [ ] Enforce RBAC scoped by tenant in backend and frontend.
- [ ] Store tenant and user info reactively in frontend state (Zustand).
- [ ] Secure token validation and role enforcement on backend.

---

# DetailedDoc — Part 3: Tenant-Aware Ticket Data Modeling & State Management

---

## 1. Database Schema Design with Tenant Isolation

All core tables include a mandatory `tenant_id` (UUID) field to ensure strict tenant data separation.

### Key Tables and Columns

| Table          | Key Columns                                                                                                         | Description                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **users**      | `id`, `tenant_id`, `clerk_id`, `email`, `role`                                                                      | Tenant-associated users                 |
| **tickets**    | `id`, `tenant_id`, `user_id`, `subject`, `description`, `priority`, `category`, `status`, `deadline`, `assigned_to` | Tenant-scoped tickets                   |
| **responses**  | `id`, `tenant_id`, `ticket_id`, `user_id`, `message`, `created_at`                                                  | Conversation messages scoped per tenant |
| **audit_logs** | `id`, `tenant_id`, `ticket_id`, `user_id`, `action_type`, `old_value`, `new_value`, `timestamp`                     | Tenant-scoped audit trail               |

---

## 2. Data Validation with Zod

Use **Zod** schemas to validate all incoming data, ensuring tenant IDs are present and valid UUIDs.

Example: Ticket creation schema

```ts
import { z } from 'zod';

export const ticketCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  user_id: z.string().uuid(),
  subject: z.string().min(5),
  description: z.string().min(10),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.string(),
});
```

- Validation protects against invalid or malicious input crossing tenant boundaries.

---

## 3. Frontend State Management with Zustand

### Tenant-Scoped State

- Zustand stores hold tenant-specific data slices:

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

- This ensures UI components reactively update only to data belonging to the active tenant.

---

## 4. Backend Data Access Patterns

- Backend queries and mutations:

  - Require extraction of `tenant_id` from the authenticated user’s JWT.
  - Include `tenant_id` in all database filters to enforce tenant isolation.
  - Reject any operations where resource tenant does not match user tenant.

- Example SQL snippet for fetching tickets:

```sql
SELECT * FROM tickets WHERE tenant_id = current_setting('request.jwt.claim.tenant_id')::uuid;
```

---

## 5. Real-Time Synchronization with Supabase

- Supabase Realtime subscriptions subscribe only to data filtered by tenant ID via RLS policies.
- The frontend subscribes to ticket and response updates for the current tenant only.
- This ensures live UI updates without risk of cross-tenant data leakage.

---

## 6. Soft Delete Support via Ticket Status

- Tickets are never physically deleted.
- Instead, a `status` field marks tickets as `closed` when “deleted.”
- Closed tickets are hidden from default views but remain in the database for audit and potential restoration.

---

## 7. Summary Checklist for Tenant-Aware Data Modeling

- [ ] Include `tenant_id` columns and enforce UUID format on all relevant tables.
- [ ] Use Zod schemas requiring valid tenant IDs for input validation.
- [ ] Manage tenant-scoped state in frontend Zustand stores.
- [ ] Enforce tenant filters in all backend queries and mutations.
- [ ] Use Supabase RLS to ensure real-time updates scoped by tenant.
- [ ] Implement soft delete using ticket status flags.

---

# DetailedDoc — Part 4: Ticket Lifecycle & Status Management with Tenant Awareness

---

## 1. Ticket Status Overview

The ticket lifecycle progresses through well-defined statuses, each scoped within a tenant’s data:

| Status        | Description                                                |
| ------------- | ---------------------------------------------------------- |
| **New**       | Ticket created and awaiting assignment within the tenant.  |
| **Open**      | Actively worked on by tenant’s support agents.             |
| **Pending**   | Waiting for input from the tenant user.                    |
| **Resolved**  | Issue believed fixed, awaiting tenant user confirmation.   |
| **Closed**    | Finalized and archived (soft deleted), no further action.  |
| **Escalated** | Requires urgent attention due to SLA breaches or priority. |

---

## 2. Status Transitions & Rules

- Transitions happen only within the ticket’s tenant scope.

- Example lifecycle:

  - `New → Open` when an agent picks up a ticket.
  - `Open → Pending` when waiting on user input.
  - `Pending → Open` on user response.
  - `Open → Resolved` when issue is fixed.
  - `Resolved → Closed` after confirmation or timeout.
  - Any status can transition to `Escalated` if deadlines are missed.

- State changes trigger updates and notifications within tenant boundaries only.

---

## 3. Soft Delete via Closed Status

- Instead of physical deletes, tickets marked as **Closed** are considered archived.
- Closed tickets are excluded from normal active views but remain accessible to tenant admins for audit or restoration.
- Restoration involves changing status from Closed back to an active state.

---

## 4. Tenant-Aware Audit Logging

- Every lifecycle event (status changes, escalations, closes) is recorded with tenant context in the audit log table.
- Audit entries include: `tenant_id`, `ticket_id`, `user_id`, `action_type`, previous and new values, timestamp.
- This facilitates full traceability within tenants.

---

## 5. Automation & SLA Enforcement

- Scheduled background jobs check ticket deadlines and escalate status within tenant boundaries.
- Escalations notify appropriate tenant users without cross-tenant leakage.

---

## 6. Role & Permission Controls

- Only authorized tenant roles can update ticket statuses and perform lifecycle actions.
- Backend verifies user role and tenant ownership before permitting status transitions.

---

## 7. Frontend UI Considerations

- Tickets grouped by status with badges and color coding.
- Agents and admins see UI actions according to role and tenant scope.
- Real-time updates reflect status changes instantly.

---

## 8. Summary Checklist for Tenant-Aware Lifecycle Management

- [ ] Define ticket status enums including `Closed` for soft delete.
- [ ] Enforce status transitions scoped by tenant.
- [ ] Log all status changes with tenant info in audit logs.
- [ ] Implement soft delete by status rather than physical deletion.
- [ ] Automate SLA escalations within tenant boundaries.
- [ ] Enforce role-based status update permissions.

---

# DetailedDoc — Part 5: Priority, Deadlines & Escalation with Tenant Awareness

---

## 1. Priority Levels

Each ticket is assigned a priority indicating urgency, scoped within the tenant:

| Priority   | Description                                 |
| ---------- | ------------------------------------------- |
| **Low**    | Minor issues; long resolution time allowed. |
| **Medium** | Standard priority with typical SLA.         |
| **High**   | Requires prompt attention.                  |
| **Urgent** | Critical issues needing immediate action.   |

---

## 2. Setting Priorities

- **User-selected** priority during ticket creation.
- **Tenant Admins and Agents** can override priorities based on actual urgency.
- Default priority assigned if user does not specify.

---

## 3. Deadlines & SLAs

- Each priority level corresponds to a Service Level Agreement deadline within the tenant context:

| Priority | SLA (Deadline) |
| -------- | -------------- |
| Urgent   | 4 hours        |
| High     | 1 day          |
| Medium   | 3 days         |
| Low      | 7 days         |

- Deadlines are set when tickets are created or priorities updated.

---

## 4. Automatic Priority Escalation

- Tenant-aware scheduled jobs (e.g., Supabase Edge Functions) periodically check for overdue tickets.
- Tickets exceeding their SLA deadlines automatically escalate priority one level up within the tenant.
- Escalations update deadlines accordingly and notify tenant support teams.

---

## 5. Manual Priority Management

- Agents and admins can manually adjust ticket priority any time.
- Manual changes reset deadlines based on new priority.
- All changes are recorded in tenant-aware audit logs.

---

## 6. UI & Workflow Impact

- Tickets sorted and filtered by priority and deadline within tenant views.
- Visual indicators highlight escalated or urgent tickets.
- Countdown timers display remaining SLA time.

---

## 7. Tenant-Aware Audit Logging

- All priority and deadline changes are logged with tenant context, including who made changes and timestamps.

---

## 8. Summary Checklist for Priority & SLA Management

- [ ] Define priority levels and associated SLAs scoped by tenant.
- [ ] Implement automatic escalation jobs respecting tenant boundaries.
- [ ] Enable manual priority adjustments with tenant-aware audit logging.
- [ ] Reflect priority and SLA status in tenant-scoped UI.
- [ ] Ensure notifications and escalations target only the relevant tenant users.

---

# DetailedDoc — Part 6: Roles, Teams, Auditing & Monitoring with Tenant Awareness

---

## 1. User Roles and Permissions

Your system defines roles scoped within each tenant to control access and capabilities:

| Role              | Permissions                                                                      |
| ----------------- | -------------------------------------------------------------------------------- |
| **User**          | Create tickets, view and respond to their own tickets within tenant.             |
| **Support Agent** | Manage tickets assigned within tenant teams, update statuses and priorities.     |
| **Admin**         | Manage users, teams, ticket assignments, and configurations within tenant.       |
| **Super Admin**   | (Optional) Cross-tenant full access, for system-wide administration and support. |

- Roles are assigned and stored in the `users` table with tenant linkage.
- Role enforcement happens at both backend (APIs, RLS) and frontend (UI visibility and action controls).

---

## 2. Team Management

- Agents are grouped into **teams or departments** belonging to a tenant (e.g., Support, Sales).
- Teams are modeled with a `tenant_id` column for tenant scoping.
- Tickets have an `assigned_to` field referencing a user ID within the tenant.
- Admins can assign and reassign tickets to teams or agents within their tenant only.

---

## 3. Audit Logging

### Purpose

- Tracks critical system changes for accountability and troubleshooting within tenant boundaries.

### Audit Log Table

- Contains tenant-scoped records of actions such as ticket status changes, priority updates, user role changes, and assignments.

| Field         | Description                                                      |
| ------------- | ---------------------------------------------------------------- |
| `tenant_id`   | Tenant owning the record                                         |
| `ticket_id`   | Ticket involved                                                  |
| `user_id`     | Actor performing the action                                      |
| `action_type` | Description of the action (status_change, priority_update, etc.) |
| `old_value`   | Previous data snapshot                                           |
| `new_value`   | New data snapshot                                                |
| `timestamp`   | When the change occurred                                         |

---

## 4. Monitoring and Dashboards

- Admins and super admins have access to tenant-scoped dashboards displaying:

  - Ticket status distributions and trends.
  - Assignment metrics.
  - Audit log summaries.
  - SLA and escalation analytics.

- Dashboards support filtering by time ranges, teams, and users within tenants.

---

## 5. Optional Approval Workflows

- For sensitive changes (e.g., priority escalations), implement tenant-scoped approval flows:

  - Agents submit change requests.
  - Tenant admins or super admins review and approve or reject.
  - All actions logged in audit trails.

---

## 6. Integration with Clerk and Supabase

- Clerk manages tenant-scoped user roles and group memberships.
- Supabase RLS policies enforce tenant boundaries across roles and teams.
- Synchronization between Clerk and Supabase ensures up-to-date user and role info.

---

## 7. Summary Checklist for Roles, Teams & Auditing

- [ ] Define and assign user roles scoped by tenant.
- [ ] Model tenant-scoped teams and manage ticket assignments accordingly.
- [ ] Implement tenant-aware audit logging for all critical actions.
- [ ] Build monitoring dashboards scoped per tenant.
- [ ] Optionally implement approval workflows with tenant boundaries.
- [ ] Synchronize Clerk and Supabase roles with tenant context.

# DetailedDoc — Part 7: Final Wrap-up and Best Practices

---

## 1. Summary of Tenant-Aware Architecture

- Your system is a **Domain-Driven Modular Monolith** supporting **multi-tenancy** with full tenant isolation enforced at both application and database layers.
- Supabase Row Level Security (RLS) combined with tenant-aware JWT tokens guarantees zero data leakage.
- Clerk manages authentication with tenant-bound users and roles.
- Zustand manages tenant-scoped frontend state.
- Soft delete mechanisms preserve data integrity and auditability.

---

## 2. Key Best Practices

### Tenant Isolation

- Always include `tenant_id` in every query, mutation, and state slice.
- Enforce tenant filtering via Supabase RLS to backstop any application-layer oversights.

### Security

- Validate all inputs with Zod schemas including tenant and role constraints.
- Protect APIs with strict token verification and role-based access control.
- Use HTTPS everywhere and secure token storage.

### Data Management

- Implement soft delete by marking tickets as `closed` rather than physical deletion.
- Maintain comprehensive tenant-aware audit logs for traceability.

### Performance

- Use Zustand’s shallow selectors and middleware to optimize tenant-scoped state updates.
- Design database indices on tenant_id for efficient multi-tenant queries.

---

## 3. Operational Considerations

- Monitor tenant usage patterns and SLA compliance using tenant-specific dashboards.
- Plan for tenant onboarding workflows and possible customizations scoped to tenants.
- Regularly audit and review tenant boundaries and access permissions.

---

## 4. Developer and Team Collaboration

- Maintain domain modularity to allow parallel development across teams.
- Use clear API contracts and tenant-aware data models to avoid cross-team confusion.
- Document tenant scoping explicitly in code and infrastructure.

---

## 5. Future Enhancements

- Introduce tenant-specific feature flags or configurations.
- Implement more granular approval workflows scoped to tenants.
- Scale out modular monolith domains into microservices if tenant scale demands.

---

## 6. Final Checklist Before Production

- [ ] Confirm all tables and APIs enforce tenant isolation with RLS and code checks.
- [ ] Validate all user roles and permissions within tenant boundaries.
- [ ] Test tenant onboarding and user synchronization flows end-to-end.
- [ ] Verify audit logging captures all critical tenant actions.
- [ ] Conduct security reviews focusing on token handling and tenant data exposure.
- [ ] Prepare monitoring and alerting for tenant SLA breaches and system health.
