# Part 1: Architecture & Technology Stack with Tenant Isolation

---

## 1. Project Goals

- Build a **robust, scalable, and maintainable multi-tenant support ticketing system** with **strict tenant data isolation**.
- Enable **fast, responsive UI** using **optimistic updates** and **persistent client caching** with Dexie.js.
- Utilize a modern 2025 tech stack: Next.js 15, React 19, Supabase, Clerk, Zustand, Zod, Tailwind CSS, and ShadCN UI.
- Design for **easy extensibility**, including future AI integrations and enhanced notifications.

---

## 2. Technology Stack Overview

| Layer              | Technology       | Purpose                                                            |
| ------------------ | ---------------- | ------------------------------------------------------------------ |
| Frontend Framework | Next.js 15.3.4   | React SSR, routing, and server actions                             |
| UI Library         | React 19.1.0     | Component rendering, hooks, and optimistic UI                      |
| Authentication     | Clerk            | User authentication, session management, tenant claims             |
| Backend & Database | Supabase 2.50.0  | PostgreSQL with Row Level Security (RLS), realtime, edge functions |
| Client State       | Zustand 5.x      | Global state management with middleware support                    |
| Client Cache       | Dexie.js 4.x     | IndexedDB-based persistent caching and delta sync                  |
| Validation         | Zod 3.x          | Input and response schema validation                               |
| Styling            | Tailwind CSS 4.x | Utility-first CSS framework                                        |
| UI Components      | ShadCN UI        | Accessible, consistent, prebuilt UI components                     |

---

## 3. High-Level Architecture Flow Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                         UI Layer (React 19)                   │
│  ┌───────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │ Tickets   │  │ Ticket View │  │ User Profile│               │
│  └───────────┘  └─────────────┘  └─────────────┘               │
└──────────────▲─────────────▲─────────────▲────────────────────┘
               │ Props/Events│ Props/Events│ Props/Events
┌──────────────▼─────────────▼─────────────▼────────────────────┐
│                  Client State Layer (Zustand)                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ tenant_id: UUID                                         │ │
│  │ tickets[], responses{}, users{}                         │ │
│  │ optimistic updates, shallow selectors, persist middleware│ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────▲─────────────▲─────────────▲────────────────────┘
               │ Sync & Optimistic UI Updates, Tenant-Scoped APIs
┌──────────────▼─────────────▼─────────────▼────────────────────┐
│                Persistent Cache Layer (Dexie.js)             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ IndexedDB for instant load                               │ │
│  │ Stores tenant-scoped tickets, responses, and metadata   │ │
│  │ Delta sync with backend, cache clear on logout          │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────▲─────────────▲─────────────▲────────────────────┘
               │ Server Actions & API Calls with Tenant Enforcement
┌──────────────▼─────────────▼─────────────▼────────────────────┐
│                  Server Layer (Next.js Server Actions)        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Authentication with Clerk JWT                             │ │
│  │ Tenant extraction and validation                          │ │
│  │ Zod input validation                                     │ │
│  │ Business logic (CRUD, notifications, audit logs)          │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────▲─────────────▲─────────────▲────────────────────┘
               │ Realtime subscriptions and DB transactions (RLS)
┌──────────────▼─────────────▼─────────────▼────────────────────┐
│                    Database Layer (Supabase)                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ PostgreSQL with tenant_id on all scoped tables           │ │
│  │ Row Level Security (RLS) enforces tenant isolation        │ │
│  │ Realtime channels filtered by tenant                      │ │
│  │ Edge functions for backend jobs (email, escalations)      │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

## 4. Tenant Isolation & Security

- **Tenant ID** (`tenant_id`) is mandatory on all relevant tables (users, tickets, responses, audit logs).
- Supabase **Row Level Security (RLS)** policies enforce filtering based on the `tenant_id` embedded in JWT tokens issued by Clerk.
- Backend API routes and server actions verify tenant context from JWTs and reject any cross-tenant access attempts.
- Soft delete is implemented via a status flag (`closed`) instead of physical deletion to preserve audit trails and allow restoration.

---

## 5. Advantages of this Architecture

- **Multi-Tenant Ready:** Scales securely to thousands of tenants with full data separation.
- **Optimistic & Responsive UI:** Uses Dexie.js and Zustand for instant updates and offline support.
- **Modern & Maintainable:** Clear domain boundaries and simple, scalable tech stack.
- **Future-Proof:** Easily extendable with AI modules, notifications, and more.

---

## 6. Next Steps

- Proceed with Part 2: Authentication & Tenant-Aware User Management.
- Define detailed Zod schemas and database tables with tenant scopes.
- Setup Zustand stores and Dexie cache layers.
- Design and implement Supabase RLS policies.

---

# Part 2: Authentication & Tenant-Aware User Management

---

## 1. Authentication with Clerk

- Use **Clerk** for all authentication flows: sign-up, sign-in, session management, and user identity.
- Clerk issues **JWT tokens** embedding key claims such as user ID and **tenant ID**.
- Tokens are passed with every request to backend services for tenant-aware authorization.

---

## 2. User-Tenant Association & Syncing

- On first login or signup, sync Clerk user data to the `users` table in Supabase:

  - Fields: `id` (UUID), `tenant_id` (UUID), `clerk_id`, `email`, `role`, `created_at`, `updated_at`.

- Tenant assignment happens either during onboarding or via admin management.
- This link ensures every user belongs to exactly one tenant, enforcing strict isolation.

---

## 3. Tenant-Aware JWT Tokens

- JWT tokens include the following relevant claims:

  ```json
  {
    "sub": "user-uuid",
    "tenant_id": "tenant-uuid",
    "role": "agent",
    "iat": 1234567890,
    "exp": 1234567890
  }
  ```

- These claims are used by Supabase RLS and backend API authorization layers to enforce tenant boundaries.

---

## 4. Role-Based Access Control (RBAC)

- Define roles with tenant-scoped permissions:

| Role        | Permissions                                 |
| ----------- | ------------------------------------------- |
| User        | Create tickets, view own tickets            |
| Agent       | Manage tickets assigned within tenant teams |
| Admin       | Manage users, tickets, teams within tenant  |
| Super Admin | (Optional) Full cross-tenant access         |

- RBAC is enforced on both backend (APIs, RLS policies) and frontend (conditional rendering, UI controls).

---

## 5. Frontend Session and State Management

- Use Clerk’s React hooks (`useUser()`) to retrieve authenticated user info and claims including tenant ID and role.
- Store tenant ID and user metadata in **Zustand** global state scoped to the session.
- All API calls include the user’s JWT token to maintain tenant context.

---

## 6. Security Considerations

- Always verify the JWT token’s signature and expiration on the backend.
- Reject any requests where the `tenant_id` claim does not match the data being accessed or modified.
- Never expose tenant or user IDs in insecure contexts such as logs or error messages.

---

## 7. Summary Checklist

- [ ] Integrate Clerk authentication components and hooks in frontend.
- [ ] Sync Clerk users to Supabase with tenant associations.
- [ ] Issue JWT tokens embedding tenant ID and roles as claims.
- [ ] Enforce RBAC scoped per tenant on backend and frontend.
- [ ] Manage tenant-aware session state reactively with Zustand.
- [ ] Implement strict token validation and authorization checks.

---

# Part 3: Tenant-Aware Data Modeling & State Management

---

## 1. Database Schema Design with Tenant Scope

All core tables incorporate a mandatory `tenant_id` UUID field to enforce tenant isolation at the data level.

### Key Tables and Fields

| Table        | Key Fields                                                                                                          | Description                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `users`      | `id`, `tenant_id`, `clerk_id`, `email`, `role`                                                                      | Tenant-associated users                       |
| `tickets`    | `id`, `tenant_id`, `user_id`, `subject`, `description`, `priority`, `category`, `status`, `deadline`, `assigned_to` | Tenant-scoped tickets                         |
| `responses`  | `id`, `tenant_id`, `ticket_id`, `user_id`, `message`, `created_at`                                                  | Ticket conversation messages scoped to tenant |
| `audit_logs` | `id`, `tenant_id`, `ticket_id`, `user_id`, `action_type`, `old_value`, `new_value`, `timestamp`                     | Tenant-scoped audit trail                     |

---

## 2. Input Validation Using Zod

- Use **Zod** schemas to validate incoming API data, explicitly requiring valid tenant IDs to prevent cross-tenant issues.

Example ticket creation schema:

```ts
import { z } from 'zod';

export const createTicketSchema = z.object({
  tenant_id: z.string().uuid(),
  user_id: z.string().uuid(),
  subject: z.string().min(5),
  description: z.string().min(10),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.string().optional(),
});
```

- Validate every API payload to ensure tenant consistency and data integrity.

---

## 3. Frontend State Management with Zustand

- Zustand manages tenant-scoped global state holding tickets, responses, and user info.

Example store setup:

```ts
const useStore = create((set) => ({
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

- This ensures UI components only react to and display data belonging to the current tenant.

---

## 4. Dexie.js Persistent Cache Integration

- Use **Dexie.js** to persist tenant-scoped data locally for instant loading and offline support.
- Cache stores tickets and responses, synced delta-wise with Supabase on app start and live updates.

---

## 5. Backend Data Access Patterns

- All database queries and mutations use the tenant ID from the authenticated user’s JWT for filtering.
- Server actions and APIs reject any operations where the resource’s tenant ID doesn’t match the user’s tenant.

Example SQL filtering tickets by tenant:

```sql
SELECT * FROM tickets WHERE tenant_id = current_setting('request.jwt.claim.tenant_id')::uuid;
```

---

## 6. Real-Time Updates with Supabase

- Supabase realtime channels push tenant-filtered data updates.
- Frontend subscribes only to relevant tenant data for tickets and responses, ensuring no cross-tenant leaks.

---

## 7. Soft Delete Strategy

- Implement soft delete by setting ticket status to `closed` rather than physical deletion.
- Closed tickets remain accessible for audits and possible restoration but hidden from active views.

---

## 8. Summary Checklist

- [ ] Define `tenant_id` on all key tables and enforce UUID format.
- [ ] Use Zod for tenant-aware input validation.
- [ ] Manage tenant-scoped state with Zustand.
- [ ] Implement Dexie.js persistent cache with tenant scope and delta sync.
- [ ] Enforce tenant filtering in all backend queries and mutations.
- [ ] Subscribe to tenant-scoped realtime updates from Supabase.
- [ ] Use soft delete via ticket status flags.

---

# Part 4: Ticket Lifecycle & Status Management with Tenant Isolation

---

## 1. Ticket Status Definitions

Tickets progress through defined statuses within their tenant context:

| Status        | Description                                               |
| ------------- | --------------------------------------------------------- |
| **New**       | Created and awaiting assignment within tenant.            |
| **Open**      | Actively worked on by tenant’s support agents.            |
| **Pending**   | Waiting on tenant user input or information.              |
| **Resolved**  | Issue believed fixed; awaiting tenant user confirmation.  |
| **Closed**    | Finalized and archived (soft deleted), no further action. |
| **Escalated** | Urgent; requires immediate attention due to SLA breach.   |

---

## 2. Status Transitions & Business Rules

- Status changes are tenant-scoped and enforced via tenant ID filtering.

- Typical lifecycle transitions:

  - `New → Open`: Agent picks up ticket.
  - `Open → Pending`: Awaiting user info.
  - `Pending → Open`: User responds.
  - `Open → Resolved`: Agent marks as resolved.
  - `Resolved → Closed`: User confirms or timeout occurs.
  - Any status can move to `Escalated` based on SLA violation.

- Each transition triggers audit logging and real-time frontend updates scoped by tenant.

---

## 3. Soft Delete via Closed Status

- Tickets are **soft deleted** by changing status to `Closed`.
- Closed tickets are hidden from active views but retained for audit and potential restoration by tenant admins.
- Restoration changes status back to an active state.

---

## 4. Tenant-Aware Audit Logging

- Every status update, escalation, or soft delete action is recorded in an audit log with `tenant_id`.
- Audit logs capture user who made the change, old and new values, timestamp, and tenant context.

---

## 5. SLA Enforcement & Escalations

- SLA deadlines per priority level are monitored per tenant via scheduled backend jobs.
- Overdue tickets automatically escalate status and priority within the tenant.
- Notifications are sent to relevant tenant users.

---

## 6. Role & Permission Controls

- Only authorized tenant users (agents, admins) can change ticket statuses.
- Backend validates tenant ownership and user role before allowing status updates.

---

## 7. Frontend UI Considerations

- Tickets are grouped and filtered by status in the UI, with clear badges and visual cues.
- Actions available depend on user role and tenant permissions.
- Real-time updates reflect status changes immediately.

---

## 8. Summary Checklist

- [ ] Define and implement tenant-scoped ticket status enums.
- [ ] Enforce status transitions within tenant boundaries.
- [ ] Soft delete tickets via status flags, no physical deletion.
- [ ] Log all lifecycle changes with tenant-aware audit entries.
- [ ] Automate SLA escalations tenant-wise with notifications.
- [ ] Validate role-based permissions per tenant for status updates.

---

# Part 5: Priority, Deadlines & Escalations with Tenant Isolation

---

## 1. Priority Levels

Each ticket has a priority level representing its urgency, scoped within the tenant:

| Priority   | Description                                      |
| ---------- | ------------------------------------------------ |
| **Low**    | Minor issues; longer resolution time acceptable. |
| **Medium** | Standard priority with typical SLA.              |
| **High**   | Requires quicker response.                       |
| **Urgent** | Critical issues needing immediate attention.     |

---

## 2. Setting Priorities

- Users select priority when creating tickets.
- Tenant agents and admins can override priorities to reflect true urgency.
- Default priority (usually Medium) assigned if unspecified.

---

## 3. Deadlines and Service Level Agreements (SLAs)

- Each priority level has an associated SLA deadline, for example:

| Priority | SLA Deadline |
| -------- | ------------ |
| Urgent   | 4 hours      |
| High     | 1 day        |
| Medium   | 3 days       |
| Low      | 7 days       |

- Deadlines are set at ticket creation or priority change.

---

## 4. Automatic Priority Escalation

- Tenant-aware scheduled backend jobs (e.g., Supabase Edge Functions) run periodically to check for tickets past their deadlines.
- Overdue tickets automatically escalate priority one level up within the tenant’s scope.
- Deadlines reset according to the new priority.
- Tenant support team members receive notifications of escalations.

---

## 5. Manual Priority Management

- Tenant agents and admins can manually update ticket priorities at any time.
- Manual changes reset associated deadlines.
- All priority changes are logged tenant-wise in audit logs.

---

## 6. UI and Workflow Impact

- Tickets sorted and filtered by priority and urgency in tenant-scoped views.
- Visual priority badges and countdown timers aid agent prioritization.
- Escalation alerts keep teams proactive.

---

## 7. Tenant-Aware Audit Logging

- All priority and deadline changes are captured with tenant ID, user, old and new values, and timestamps.

---

## 8. Summary Checklist

- [ ] Define tenant-scoped priority levels and SLAs.
- [ ] Implement tenant-aware automatic priority escalation jobs.
- [ ] Enable manual priority updates with tenant audit logs.
- [ ] Reflect priorities and escalations clearly in tenant UIs.
- [ ] Ensure notifications target tenant-specific users only.

---

# Part 6: Roles, Teams, Auditing & Monitoring with Tenant Isolation

---

## 1. User Roles and Permissions

Roles define what users can do within their tenant:

| Role              | Permissions                                                           |
| ----------------- | --------------------------------------------------------------------- |
| **User**          | Create tickets, view/respond to own tickets only                      |
| **Support Agent** | Manage and update tickets assigned to their tenant/team               |
| **Admin**         | Manage users, teams, assign tickets, configure settings within tenant |
| **Super Admin**   | (Optional) Full system-wide access across tenants                     |

Roles are stored in the `users` table with tenant association and enforced via backend logic and frontend UI.

---

## 2. Team Management

- Support agents are organized into **teams or departments** scoped by tenant (e.g., Sales, Support).
- Teams have `tenant_id` to enforce isolation.
- Tickets have an `assigned_to` field linking them to specific users within the tenant.
- Admins can assign/reassign tickets to teams or individuals within their tenant boundaries.

---

## 3. Audit Logging

- Audit logs track critical actions such as ticket status changes, priority updates, user management, and assignments.
- Audit entries include: `tenant_id`, `ticket_id`, `user_id` (actor), action type, old and new values, and timestamp.
- Logs ensure traceability and accountability scoped to each tenant.

---

## 4. Monitoring and Dashboards

- Tenant admins and super admins access dashboards showing:

  - Ticket volumes and status distributions
  - Assignment and resolution metrics
  - SLA compliance and escalation trends
  - Audit log summaries filtered by tenant

Dashboards help identify bottlenecks and monitor team performance within tenant scopes.

---

## 5. Optional Approval Workflows

- Sensitive actions (e.g., priority escalations) can trigger approval workflows scoped per tenant:

  - Agents submit change requests.
  - Tenant admins or super admins review and approve/reject.
  - All actions logged for transparency.

---

## 6. Integration with Clerk and Supabase

- Clerk manages user roles and groups with tenant context.
- Supabase RLS enforces data access control based on tenant and role.
- Synchronization ensures up-to-date role and team information.

---

## 7. Summary Checklist

- [ ] Define tenant-scoped roles and permissions.
- [ ] Model tenant-scoped teams and assign tickets accordingly.
- [ ] Maintain tenant-aware audit logs for critical actions.
- [ ] Build tenant-specific monitoring dashboards.
- [ ] Optionally implement tenant-scoped approval workflows.
- [ ] Sync Clerk user roles/groups with Supabase access controls.
