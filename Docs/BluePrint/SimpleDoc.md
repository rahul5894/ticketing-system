Here’s the **updated SimpleDoc — Part 1: System Architecture & Project Setup with Tenant Isolation**, simplified but reflecting your enhanced architecture and tenant isolation approach:

---

# SimpleDoc — Part 1: System Architecture & Project Setup with Tenant Isolation

---

## 1. Architecture Overview

- The app is a **modular monolith**: one deployable unit with clear modules like auth, ticketing, teams, notifications.
- Designed for **multi-tenancy**: many tenants share the same system securely.
- Tenant data is isolated using a **shared database schema** with a `tenant_id` field in every relevant table.
- Tenant isolation is enforced on the frontend, backend, and database layers.

---

## 2. Multi-Tenancy & Tenant Isolation

- Each tenant corresponds to an organization or client.
- Data from different tenants is separated logically by `tenant_id`.
- Supabase Row Level Security (RLS) enforces tenant isolation at the database level using JWT claims.
- JWT tokens from Clerk embed the tenant ID and user roles.

---

## 3. Tenant Isolation Implementation

- All tenant data tables have a `tenant_id` UUID column.
- Example tables: users, tickets, responses, audit_logs, teams.
- RLS policies restrict row access to matching `tenant_id` from JWT token.

Example RLS policy:

```sql
CREATE POLICY "Tenant row access" ON tickets
USING (tenant_id = current_setting('request.jwt.claim.tenant_id')::uuid);
```

---

## 4. Authentication & Tenant Context

- Clerk handles authentication and session management.
- On login/signup, users are linked to tenants in the users table.
- Tokens embed tenant ID for backend tenant-aware access.
- All API calls carry tenant context for filtering and authorization.

---

## 5. Data Flow with Tenant Awareness

- Frontend stores tenant info after login.
- All requests send JWT with tenant claims.
- Backend extracts tenant ID and enforces it in queries.
- Zustand manages tenant-scoped state.
- Supabase realtime subscriptions only push data for the current tenant.

---

## 6. Technology Stack Summary

| Technology       | Role in Tenant-Aware Architecture              |
| ---------------- | ---------------------------------------------- |
| Next.js 15.3.4   | Frontend and backend with tenant-scoped APIs   |
| React 19.1.0     | UI rendering tenant-specific data              |
| Clerk            | Auth and tenant-aware JWT tokens               |
| Supabase 2.50.0  | DB with RLS, realtime tenant-filtered updates  |
| Zustand 5.x      | Tenant-scoped frontend state management        |
| Dexie.js 4.x     | Client cache for offline and instant data load |
| Zod 3.x          | Input validation including tenant IDs          |
| Tailwind CSS 4.x | Consistent UI styling                          |

---

## 7. Setup Checklist

- [ ] Add `tenant_id` to all tenant data tables.
- [ ] Create and verify RLS policies per table.
- [ ] Integrate Clerk to embed tenant ID in JWT tokens.
- [ ] Enforce tenant filtering on backend APIs.
- [ ] Manage tenant-scoped frontend state with Zustand.
- [ ] Setup Supabase realtime subscriptions scoped by tenant.
- [ ] Use Zod for tenant-aware validation.

---

# SimpleDoc — Part 2: Authentication & Tenant-Aware User Management

---

## 1. Authentication with Clerk

- Use **Clerk** for user sign-up, sign-in, session management, and identity.
- Clerk issues **JWT tokens** including important claims like `user_id`, `tenant_id`, and `role`.
- Tokens are sent with every backend request to enable tenant-aware access.

---

## 2. User-Tenant Association & Syncing

- When users sign up or log in, the backend syncs Clerk user data to the Supabase `users` table.
- Each user is linked to a specific tenant via the `tenant_id`.
- Tenant assignment can happen during onboarding or managed by tenant admins.

---

## 3. Tenant-Aware JWT Tokens

- Tokens include:

  ```json
  {
    "sub": "user-uuid",
    "tenant_id": "tenant-uuid",
    "role": "agent",
    "iat": 1234567890,
    "exp": 1234567890
  }
  ```

- These claims enforce tenant scoping and role-based access on backend and database.

---

## 4. Role-Based Access Control (RBAC)

| Role        | Permissions                                  |
| ----------- | -------------------------------------------- |
| User        | Create tickets, view/respond to own tickets  |
| Agent       | Manage tenant tickets assigned to them       |
| Admin       | Manage users, tickets, teams in their tenant |
| Super Admin | Full system access across tenants (optional) |

- RBAC enforced both on backend and frontend UI.

---

## 5. Frontend Session and State

- Use Clerk’s React hooks (`useUser()`) to get authenticated user and tenant info.
- Store tenant ID and user metadata in Zustand global state scoped to the session.
- Include JWT tokens with all API calls for tenant-aware backend access.

---

## 6. Security Considerations

- Always verify JWT signature and expiration on backend.
- Reject requests where tenant ID in token does not match accessed data.
- Use secure HTTPS connections and token storage.

---

## 7. Summary Checklist

- [ ] Integrate Clerk authentication UI and React hooks.
- [ ] Sync Clerk users to Supabase users table with tenant associations.
- [ ] Issue JWT tokens embedding tenant ID and role claims.
- [ ] Enforce RBAC scoped per tenant on backend and frontend.
- [ ] Manage tenant-aware session state reactively with Zustand.
- [ ] Implement strict JWT validation and tenant authorization.

---

# SimpleDoc — Part 3: Tenant-Aware Data Modeling & State Management

---

## 1. Database Schema with Tenant Isolation

- All tenant-specific tables include a mandatory `tenant_id` UUID field.
- Key tables:

| Table        | Tenant Column | Purpose                      |
| ------------ | ------------- | ---------------------------- |
| `users`      | `tenant_id`   | Associates users to tenants  |
| `tickets`    | `tenant_id`   | Tickets owned by tenants     |
| `responses`  | `tenant_id`   | Ticket conversation messages |
| `audit_logs` | `tenant_id`   | Tenant-scoped audit trail    |

---

## 2. Input Validation Using Zod

- Use **Zod** schemas to validate API inputs and ensure `tenant_id` is present and valid.
- Example ticket creation schema:

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

---

## 3. Frontend State Management with Zustand

- Zustand manages tenant-scoped global state with tenant ID, tickets, responses, and users.
- Example setup:

```ts
import create from 'zustand';

const useStore = create((set) => ({
  tenant_id: null,
  tickets: [],
  responses: {},
  users: [],
  setTenant: (tenantId) => set({ tenant_id: tenantId }),
  setTickets: (tickets) => set({ tickets }),
  addResponse: (ticketId, response) =>
    set((state) => ({
      responses: {
        ...state.responses,
        [ticketId]: [...(state.responses[ticketId] || []), response],
      },
    })),
  setUsers: (users) => set({ users }),
}));
```

---

## 4. Dexie.js Persistent Cache

- Use Dexie.js to cache tenant-scoped data locally for fast loading and offline support.
- Cache indexed by `tenant_id` for efficient queries.
- Sync with backend using delta updates and Supabase realtime.

---

## 5. Backend Data Access

- Backend queries always filter by `tenant_id` extracted from JWT claims.
- Reject operations where token tenant does not match data tenant.
- Example SQL:

```sql
SELECT * FROM tickets WHERE tenant_id = current_setting('request.jwt.claim.tenant_id')::uuid;
```

---

## 6. Supabase Realtime

- Subscribe to realtime updates filtered by tenant ID.
- Updates to tickets and responses push instantly to client state.

---

## 7. Soft Delete Strategy

- Use status flag `closed` instead of physical delete.
- Closed tickets hidden from active UI but retained for audit and restore.

---

## 8. Summary Checklist

- [ ] Add `tenant_id` columns to tenant data tables.
- [ ] Validate inputs with Zod schemas requiring tenant ID.
- [ ] Manage tenant-scoped frontend state with Zustand.
- [ ] Implement Dexie.js persistent tenant-scoped cache.
- [ ] Enforce tenant filtering in backend queries.
- [ ] Subscribe to tenant-filtered realtime data.
- [ ] Use soft delete via status flags.

---

# SimpleDoc — Part 4: Ticket Lifecycle & Status Management with Tenant Isolation

---

## 1. Ticket Status Definitions

Tickets have defined statuses scoped per tenant to reflect their current lifecycle:

| Status        | Description                                           |
| ------------- | ----------------------------------------------------- |
| **New**       | Created, waiting for assignment                       |
| **Open**      | Actively worked on by tenant support agents           |
| **Pending**   | Waiting on tenant user input or info                  |
| **Resolved**  | Issue fixed, awaiting tenant confirmation             |
| **Closed**    | Finalized and archived (soft deleted)                 |
| **Escalated** | Urgent attention needed due to SLA or priority breach |

---

## 2. Status Transitions & Business Rules

- Transitions happen only within the tenant scope.

- Common flows:

  - New → Open: Agent picks ticket
  - Open → Pending: Waiting on user
  - Pending → Open: User responds
  - Open → Resolved: Agent marks fixed
  - Resolved → Closed: User confirms or timeout
  - Any → Escalated: SLA breach or urgent issue

- Each change triggers tenant-aware audit logs, real-time updates, and notifications.

---

## 3. Soft Delete via Closed Status

- Tickets are soft deleted by changing status to `Closed`.
- Closed tickets are hidden from active views but kept for audits and possible restoration.
- Restoration changes status back to active.

---

## 4. Tenant-Aware Audit Logging

- Logs every status change with tenant, ticket, user, old and new status, and timestamp.
- Provides traceability scoped per tenant.

---

## 5. SLA Enforcement & Escalations

- Scheduled jobs check SLA deadlines tenant-wise.
- Overdue tickets escalate priority/status.
- Notifications sent to tenant users.
- Escalations recorded in audit logs.

---

## 6. Role & Permission Controls

- Only authorized tenant users (agents, admins) can update ticket statuses.
- Backend validates tenant and role before allowing changes.

---

## 7. Frontend UI Considerations

- Group tickets by status with badges.
- Show actions based on role and tenant.
- Reflect real-time lifecycle changes instantly.

---

## 8. Summary Checklist

- [ ] Define tenant-scoped ticket statuses.
- [ ] Enforce status transitions within tenant scope.
- [ ] Implement soft delete using status flags.
- [ ] Log lifecycle changes with tenant context.
- [ ] Automate SLA escalations tenant-wise.
- [ ] Enforce role-based permissions per tenant.

---

# SimpleDoc — Part 5: Priority, Deadlines & Escalations with Tenant Isolation

---

## 1. Priority Levels

Each ticket has a priority level scoped per tenant indicating urgency:

| Priority   | Description                               |
| ---------- | ----------------------------------------- |
| **Low**    | Minor issues; longer resolution time okay |
| **Medium** | Standard priority with typical SLA        |
| **High**   | Requires quicker response                 |
| **Urgent** | Critical issues needing immediate action  |

---

## 2. Setting Priorities

- Users select priority when creating tickets.
- Tenant agents and admins can override priority.
- Default priority (usually Medium) is assigned if none specified.

---

## 3. Deadlines and SLAs

- Each priority corresponds to a tenant-specific SLA deadline:

| Priority | SLA Deadline |
| -------- | ------------ |
| Urgent   | 4 hours      |
| High     | 1 day        |
| Medium   | 3 days       |
| Low      | 7 days       |

- Deadlines are set on ticket creation or priority change.

---

## 4. Automatic Priority Escalation

- Tenant-scoped backend jobs (e.g., Supabase Edge Functions) check tickets past deadlines.
- Overdue tickets automatically escalate priority by one level.
- Deadlines reset based on new priority.
- Notifications sent to tenant users.
- All escalations logged with tenant context.

---

## 5. Manual Priority Management

- Tenant agents/admins can manually update priorities.
- Manual changes reset deadlines.
- Changes are logged tenant-wise.

---

## 6. UI & Workflow Impact

- Tickets sortable and filterable by priority and deadline.
- Visual badges and countdowns help prioritization.
- Alerts keep teams proactive.

---

## 7. Tenant-Aware Audit Logging

- All priority and deadline changes logged with tenant ID, user, old/new values, and timestamps.

---

## 8. Summary Checklist

- [ ] Define tenant-scoped priority levels and SLAs.
- [ ] Implement automatic priority escalation tenant-wise.
- [ ] Enable manual priority updates with audit logging.
- [ ] Reflect priorities and escalations clearly in tenant UIs.
- [ ] Ensure notifications target tenant-specific users.

---

# SimpleDoc — Part 6: Roles, Teams, Auditing & Monitoring with Tenant Isolation

---

## 1. User Roles and Permissions

- Define roles scoped per tenant that control user capabilities:

| Role              | Permissions                                                    |
| ----------------- | -------------------------------------------------------------- |
| **User**          | Create tickets, view/respond to own tickets only               |
| **Support Agent** | Manage tickets assigned to their tenant/team                   |
| **Admin**         | Manage users, teams, tickets, and settings within their tenant |
| **Super Admin**   | (Optional) Full system-wide access across tenants              |

- Roles are stored in the `users` table with tenant linkage.
- Enforcement happens both backend (API and RLS) and frontend (UI restrictions).

---

## 2. Team Management

- Agents grouped into tenant-scoped teams (e.g., Support, Sales).
- Teams have `tenant_id` to ensure isolation.
- Tickets assigned to users or teams within tenant.
- Admins assign or reassign tickets within tenant boundaries.

---

## 3. Audit Logging

- Tenant-scoped audit logs track critical actions:

  - Ticket status and priority changes
  - User and role management
  - Ticket assignments

- Logs include tenant ID, user ID, action details, old/new values, timestamps.

---

## 4. Monitoring and Dashboards

- Tenant admins and super admins see dashboards with:

  - Ticket volumes and status
  - SLA compliance and escalations
  - Assignment and resolution metrics
  - Audit log summaries filtered by tenant

---

## 5. Optional Approval Workflows

- Tenant-scoped workflows for sensitive actions (e.g., priority escalations):

  - Agents submit requests.
  - Tenant admins review and approve/reject.
  - All actions logged.

---

## 6. Integration with Clerk and Supabase

- Clerk manages tenant-aware roles and groups.
- Supabase RLS enforces tenant and role-based access.
- Sync ensures role info is consistent and up-to-date.

---

## 7. Summary Checklist

- [ ] Define tenant-scoped user roles and permissions.
- [ ] Model tenant teams and manage ticket assignments accordingly.
- [ ] Maintain tenant-aware audit logs for critical actions.
- [ ] Build tenant-specific monitoring dashboards.
- [ ] Optionally implement tenant-scoped approval workflows.
- [ ] Sync Clerk roles/groups with Supabase access controls.

---

# SimpleDoc — Part 7: Final Wrap-up and Best Practices

---

## 1. Summary of Tenant-Aware Architecture

- The system is a **modular monolith** supporting secure multi-tenancy.
- Tenant isolation is enforced at all layers: frontend, backend, DB (Supabase RLS), and auth (Clerk JWT claims).
- Hybrid client caching (Dexie.js), realtime updates (Supabase realtime), and optimistic UI (Zustand) deliver fast, scalable, responsive experience.
- Soft deletes ensure data integrity and auditability.
- RBAC and team management control access and permissions.
- Audit logs and dashboards provide tenant-specific visibility and compliance.

---

## 2. Best Practices

- **Tenant Isolation:** Always filter queries and state by `tenant_id`.
- **Security:** Validate inputs (Zod), enforce JWT verification, use HTTPS.
- **Data Integrity:** Use soft deletes, maintain audit logs.
- **Performance:** Use indexed tenant_id columns, Dexie caching, realtime sync.
- **Monitoring:** Set up tenant-scoped dashboards and alerts.

---

## 3. Operational Considerations

- Monitor SLA compliance and tenant activity.
- Regularly audit access controls and tenant boundaries.
- Prepare onboarding workflows and scaling plans.

---

## 4. Developer Collaboration

- Maintain clear tenant boundaries in code.
- Use consistent tenant scoping patterns.
- Automate tenant-aware testing.

---

## 5. Future Enhancements

- Tenant feature flags and configs.
- Advanced approval workflows.
- AI and automation modules.
- Modular microservices for scale.

---

## 6. Final Checklist

- [ ] Confirm tenant isolation in all layers.
- [ ] Validate roles and permissions tenant-wise.
- [ ] Test onboarding and user sync.
- [ ] Ensure audit logging is complete.
- [ ] Conduct security audits.
- [ ] Set up monitoring and alerting per tenant.
