Perfect. I’ll now generate a 2025-updated, production-grade Supabase Realtime integration guide based on:

* Next.js 15.3.4 with App Router
* Supabase JS v2.50.1
* Clerk v6.23.0 with custom JWT
* Hosted Supabase Postgres
* Client-side realtime usage with Row Level Security
* postgres\_changes (INSERT, UPDATE, DELETE only)

I’ll include best practices for auth, subscriptions, error handling, CSP, testing, and cleanup.
I’ll get back to you shortly with a complete doc you can directly apply to your project.


# Supabase Realtime Integration with Next.js 15 and Clerk (2025 Best Practices)

Integrating Supabase's real-time database updates into a Next.js 15 application (App Router) with Clerk for authentication requires careful setup. This guide covers the **latest methods (as of 2025)** for an optimal real-time integration, given the following stack:

* **Framework:** Next.js 15 (App Router) – using client-side React components for realtime updates.
* **Database & Realtime:** Supabase (PostgreSQL 17) with the JavaScript client library v2.50.1.
* **Authentication:** Clerk (v6.23.0) providing JWTs for authenticated users (using a Clerk JWT template with a custom `role` claim, etc.).
* **Use Case:** Multi-tenant SaaS (ticketing system) with Row Level Security (RLS) to isolate tenant data. We will subscribe to **Postgres changes** (INSERT/UPDATE/DELETE) on specific tables in real-time (no use of broadcast or presence in this scenario).

This document will walk through **configuring Supabase & Clerk**, **enabling realtime** on the database, **client-side setup**, **example code** for subscribing to changes, and **troubleshooting** common issues. By the end, your Next.js app should receive live updates from Supabase as data changes.

## 1. Configure Supabase and Clerk for JWT Auth

Before setting up realtime, ensure Supabase accepts Clerk-issued JWTs and that the tokens carry the right claims:

* **Enable Clerk Integration in Supabase:** In Supabase, add a Third-Party Auth integration for Clerk. In the Supabase dashboard, navigate to **Authentication > Third-Party Auth** and add Clerk (with your Clerk instance domain). This tells Supabase to trust and verify JWTs from Clerk’s domain. If self-hosting or using the CLI, you’d set in `supabase/config.toml`:

  ```toml
  [auth.third_party.clerk]
  enabled = true
  domain = "YOUR_SUBDOMAIN.clerk.accounts.dev"
  ```

* **Customize Clerk JWT (Session Token):** Ensure the Clerk JWT includes any claims your RLS policies need. At minimum, add a `role` claim set to `"authenticated"` for logged-in users. (Clerk’s "Connect with Supabase" setup can do this automatically.) In your case, the JWT payload already includes `"role": "authenticated"`, which is correct. You might also include a tenant identifier claim (e.g. `tenant_id`) if your RLS policies use it – make sure this claim is populated for each user (avoid it being `null` in production tokens).

* **JWT Verification Method:** With the above integration, Supabase will use Clerk’s public keys to verify the token (no need to share your Supabase JWT secret with Clerk, as older methods did). The old approach of manually configuring Clerk JWT templates with Supabase's secret is now **deprecated** as of April 2025. It’s recommended to use Clerk’s standard session tokens via the Third-Party Auth integration for better security and less maintenance. (If you have an existing Clerk JWT template using Supabase’s secret, it will still work for now, but consider migrating. Supabase no longer charges Third-Party MAUs for the old method until at least 2026.)

**Why this matters:** Supabase will inspect the JWT on every request (including realtime messages) to determine the Postgres role (`anon` vs `authenticated`) and apply RLS. If the token is not recognized or missing the `role` claim, the user might be treated as `anon` (unauthenticated), causing RLS to deny access. By configuring the integration and claims properly, you ensure that realtime events will be authorized under the correct role and tenant context.

## 2. Enable Realtime on Your Database Tables

Supabase’s realtime (Postgres Changes) feature works via logical replication. **You must explicitly enable replication for any tables** you want to get realtime notifications for. This is a one-time setup per table:

* **Using the Dashboard:** Go to your Supabase project’s dashboard, select **Database > Replication**. Under the `supabase_realtime` publication, **toggle on** the tables you want to listen to. (Click the "Tables" button under Source if needed, then enable the switch for each table.) For example, if you want realtime on a `messages` table, make sure it’s toggled on in the UI.

* **Using SQL:** Alternatively, run SQL in the Supabase SQL editor to add tables to the publication. For example:

  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  ```

  This achieves the same result (ensuring the `messages` table’s changes are published to the realtime replication slot).

If you **skip this step, your realtime subscriptions will receive no data**. It’s a common oversight – even if your client code is correct, forgetting to enable replication means no events will broadcast.

> **Note:** Supabase enables the `supabase_realtime` publication by default, but you control which tables are included. You only need to do this once per table (the setting persists). In a fresh project, you might enable it during table creation (the GUI has a checkbox for “Enable realtime”). If you later add new tables for realtime, remember to enable them too.

## 3. Set Up the Supabase Client in Next.js (with Clerk JWT)

Next, initialize the Supabase client in your Next.js app such that it knows about the Clerk JWT for authenticated requests. In a Next.js 15 App Router app, you typically do this in a module that can be imported by your components or pages.

**Recommended approach (2025):** Use the Supabase client’s `accessToken` configuration to supply the Clerk JWT. This ensures all Supabase requests (including realtime) use the latest token. For example:

```ts
// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { Clerk } from "@clerk/clerk-js"; // or appropriate Clerk import

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Assuming you have access to the Clerk session (e.g., via Clerk.session or useSession in React)
const session = typeof window !== "undefined" ? Clerk.session : undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // Provide the JWT from Clerk for all requests:
  accessToken: async () => session?.getToken({ template: 'supabase' }) ?? null,
});
```

In this snippet, `session.getToken({ template: 'supabase' })` retrieves the Clerk JWT (for example, if your Clerk JWT template is named "supabase"). We pass it to `createClient` via the `accessToken` option. Now, whenever Supabase makes a request (e.g., fetching or opening a realtime channel), it will include this token automatically.

A few notes on this setup:

* **Clerk session access:** In React, you can get the session/token via Clerk’s hooks. For example, with `@clerk/nextjs`, you might use:

  ```jsx
  import { useAuth } from '@clerk/nextjs';
  const { getToken } = useAuth();
  const token = await getToken({ template: 'supabase' });
  ```

  If you are outside React or using vanilla ClerkJS, you can use `Clerk.session`. Ensure the code runs **on the client side** (after hydration), since `Clerk.session` is not available server-side. You might initialize the client in a useEffect or in a context that runs on the client.

* **Single instance:** Create the client once (as above) and reuse it across your app. This prevents opening multiple websocket connections. For example, the `supabase` export from `supabaseClient.ts` can be imported wherever needed. Avoid re-calling `createClient` in every component render.

* **No Supabase Edge Functions needed:** We’re using direct client-side subscriptions. Your Next.js API routes (serverless functions) are not involved in realtime listening (they might be used for other things like CRUD, but realtime will be handled in the browser). Supabase’s global realtime service will push updates directly to the client.

* **Next.js Server Components:** Use realtime only in client-side components. If using the App Router, mark the component as `"use client"` at top, since a server component cannot maintain a live WebSocket connection. Typically, you'll fetch initial data on the server (optional) and then subscribe to changes on the client.

### Setting the JWT for Realtime

Including `accessToken` in `createClient` covers RESTful requests, but for **Realtime** connections it's often necessary to explicitly set the auth on the realtime socket. Supabase’s v2 client provides a method for this:

```ts
supabase.realtime.setAuth(token);
```

Calling `supabase.realtime.setAuth(<JWT>)` will authenticate the realtime WebSocket connection with the provided JWT. In practice, if you initialize the client *after* the user is logged in, the `accessToken` function may suffice. However, if the token becomes available or changes **after** the client is created (e.g., user logs in, or Clerk refreshes the session), you should call `setAuth` with the new token. This ensures the socket re-authenticates as that user.

**Important:** Clerk's session tokens are short-lived for security. Clerk will automatically refresh them, but you need to update Supabase when that happens. The Supabase docs recommend setting up a listener to refresh the realtime auth whenever your auth state changes. For example, Clerk could provide an event or you might call `setAuth` again on an interval. In an AWS Cognito example, Supabase docs show updating `supabase.realtime.setAuth(...)` whenever the auth library indicates a new token. For Clerk, you might re-run `getToken()` and call `setAuth` whenever the user signs in or Clerk rotates the token.

In summary, **initialize with the token and keep it updated**. If the user is logged out, you can omit the token (Supabase will treat the user as anon, which may have no realtime access under RLS). When the user logs in, obtain the token and call `setAuth` before subscribing to channels.

## 4. Subscribing to Database Changes in Real Time (Client-side)

With the client configured, you can now subscribe to Postgres changes from your Next.js components. Supabase v2 uses a channel-based API for realtime. Below is an example React component that subscribes to all changes on a `messages` table:

```jsx
"use client";  // ensure this component is rendered on the client side
import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';  // import the pre-configured client
import { useAuth } from '@clerk/nextjs';           // Clerk hook to get token

export default function MessagesList() {
  const { getToken } = useAuth();
  
  useEffect(() => {
    let channel;
    const subscribeToMessages = async () => {
      // Ensure the realtime socket is using the latest JWT
      const token = await getToken({ template: 'supabase' });
      if (token) {
        supabase.realtime.setAuth(token);  // authenticate the realtime connection:contentReference[oaicite:11]{index=11}
      }
      // Subscribe to all inserts/updates/deletes on "messages" table in "public" schema
      channel = supabase.channel('public:messages')  // channel name can be any unique string
        .on(
          'postgres_changes', 
          { event: '*', schema: 'public', table: 'messages' }, 
          (payload) => {
            console.log('Realtime change received:', payload);
            // TODO: update state or trigger a re-fetch of data as needed
          }
        )
        .subscribe();
    };

    subscribeToMessages();

    // Cleanup on component unmount: unsubscribe to avoid memory leaks
    return () => {
      if (channel) supabase.removeChannel(channel);
      // Alternatively: channel.unsubscribe();
    };
  }, [getToken]);

  // ... render your component UI (list of messages etc.) ...
}
```

Let’s break down what’s happening above:

* We call `supabase.channel('public:messages')` to create a realtime channel. The string `'public:messages'` is an arbitrary name for the channel (it could be any name except `"realtime"` which is reserved). Using a schema and table name in the channel identifier is a convenient convention but not required.

* We attach an `.on('postgres_changes', ...)` handler to listen for Postgres changes. We specify the filter `{ event: '*', schema: 'public', table: 'messages' }` to catch all change events (INSERT, UPDATE, DELETE) on the `public.messages` table. You can narrow this to specific events or add a finer filter if needed. For instance, you could use `event: 'INSERT'` to only get new records, or add a `filter` condition for granular filtering (like `filter: 'user_id=eq.123'` to only get changes for a specific user).

* We then call `.subscribe()` to initiate the subscription. At this point, the client will open a WebSocket connection to the Supabase realtime server if one isn’t already open.

* We made sure to call `supabase.realtime.setAuth(token)` **before** subscribing. This sends our Clerk JWT to the realtime server to authorize this connection. If the token is missing or invalid, the subscription might silently fail or receive no events (Supabase will treat the user as anon if no valid JWT is provided).

* The callback `(payload) => { ... }` will run every time a matching change occurs. The `payload` contains details of the change (new record, old record, table, etc.). For example, on an insert, `payload.new` would have the new row data.

* We use `useEffect` with an empty dependency array (or `[getToken]` which is stable) so that we subscribe once on component mount. On unmount, we clean up by calling `supabase.removeChannel(channel)` (or `channel.unsubscribe()`), which closes that subscription. Always unsubscribe to avoid accumulating open connections if the user navigates away.

**Testing the subscription:** Once this is set up, test it by performing an action that modifies the `messages` table:

* Insert a new message (you can use your app’s normal flow, or the Supabase SQL editor, or another tool). You should see the `console.log` from the subscription callback with the payload of the new record.
* Similarly, updating or deleting a row should trigger events if you included those in the filter (we used `event: '*'` so all changes trigger).
* Ensure the user performing the change is authorized to do so, and that the change matches any filter conditions used in `.on()`.

## 5. Row Level Security (RLS) Considerations for Realtime

Since you have RLS enabled for tenant isolation, make sure your policies allow the realtime subscription to see the changes. Supabase Realtime respects RLS by **verifying each change against your policies** before broadcasting:

* **Select policies:** For a client to receive a change event, it’s as if that client attempted to `SELECT` the changed row. You should have a SELECT policy on the table that allows the user to read the row in question (e.g., `tenant_id == auth.jwt().tenant_id` or similar condition using the JWT claims). If no appropriate SELECT policy exists (or if the condition fails), the realtime server will **not send** the event to that client. In practice, this means you might need a broad "can view changes" select policy using the same criteria as your usual read access.

* **Verify `tenant_id` claim:** If your JWT has a `tenant_id` claim, your RLS policy likely uses it. Ensure that claim is correctly set in the JWT for each user. If it's `null` or missing, the policy may reject access. For example, a policy might say ` USING (tenant_id = auth.jwt()->> 'tenant_id')`. If `auth.jwt()->> 'tenant_id'` is null, that check fails and the event won’t go through. In development, you can allow a `null` tenant (or assign a default tenant) to avoid being locked out unintentionally.

* **Role claim effect:** We included `"role": "authenticated"` in the token and configured Supabase accordingly. This means the Postgres role for the connection will be `authenticated` (instead of `anon`). Your RLS policies probably target the `authenticated` role (e.g., `FOR SELECT TO authenticated`). If the role claim was wrong or missing, the client might be treated as `anon` and thus not match the policy. (This is why adding the role claim was crucial in Step 1.)

* **Testing with RLS:** After setting up, test that a user can actually receive their permitted events and not others. For instance, if User A should only see tenant `X` data, try an insert for tenant `Y` and confirm User A’s listener does **not** get it. If it does, your policy might be too open. If User A doesn’t get an event for their own tenant’s new record, then something in the token or policy is misconfigured.

Supabase’s documentation encourages using your JWT’s claims to implement these RLS checks. By using Clerk’s claims (like email, organization, roles, etc.), you can write flexible policies. The key is consistency between what the JWT provides and what the policy expects.

## 6. Troubleshooting Real-Time Issues

If your real-time functionality isn’t working as expected, run through this checklist of common issues:

* **Replication not enabled:** This is the #1 issue. Double-check that the target table is added to `supabase_realtime` (via dashboard or `ALTER PUBLICATION`). If not, no events will fire.

* **Missing or incorrect JWT in the client:** If you don’t call `setAuth` with a valid token, your realtime channel will effectively be unauthorized. In many cases, you simply won’t receive anything (and no obvious error). Always obtain the Clerk JWT and set it on the Supabase client **before** subscribing to channels. If the user isn’t logged in, the subscription will use the anonymous role – which likely has no access under RLS.

* **JWT not refreshing:** If events come through initially but stop after some time, your token might have expired. Clerk tokens are short-lived (often 15 minutes by default). Ensure you update the token for the Supabase client when it refreshes. You can handle this by listening to Clerk’s session changes or periodically re-calling `supabase.realtime.setAuth(newToken)`. Supabase does not automatically re-authenticate the socket unless you tell it to. The Supabase docs explicitly show setting up such listeners for third-party auth.

* **JWT format issues:** If the realtime WebSocket is failing to authenticate, open your browser’s dev console and look for error messages. A known quirk is that the JWT must include a `"typ": "JWT"` header. One developer noted that missing this header in a custom JWT led to an `"error_generating_signer"` error on the realtime socket. Clerk’s tokens typically have the correct header, but if you use a custom signing method, ensure the header includes `"typ": "JWT"` (alongside the algorithm).

* **RLS policy blocking events:** If replication is on and you’ve set the auth, yet you still get no events, it could be RLS. Try temporarily relaxing the policy (e.g., allow all selects for testing) to see if events come through. If they do, refine the policy. Remember that the **old and new record data** are checked against your SELECT policy for that user. For example, if your policy filters by `tenant_id` and an update changes the `tenant_id` of a row, the event might not send to a user who no longer should see it. Usually, the **new row** is what matters for INSERT/UPDATE visibility.

* **Multiple clients or context:** Avoid creating multiple Supabase clients in the same app with the same token; it’s not inherently problematic, but each will open a socket. If you see duplicate events, you might be subscribing twice. Use a single channel or throttle re-subscription if your component re-mounts.

* **Using the correct library version:** Ensure you are using Supabase JS v2 syntax since your versions suggest v2.x. The v1 syntax (`supabase.from('table').on('INSERT', ...)`) won’t work in v2 (and gives types like `subscribe not found` errors). Use the channel approach as shown above. (It looks like you already are, but it’s worth noting in general.)

* **Server-side subscription (if attempted):** If you tried to subscribe on the server (e.g., in an API route or Next.js server component), it won’t work as expected. The server environment can receive events, but maintaining a live connection in a serverless function or during SSR is impractical. Stick to client-side for realtime updates to the UI. For server-side reactions to DB changes, consider Supabase Functions or webhooks instead.

* **Check network connection:** The realtime features use a WebSocket. If you have a very restrictive network or the user loses internet, events will stop. Supabase client will attempt to reconnect automatically. You can monitor connection state via the socket if needed. In dev, ensure you’re not getting CORS or network errors connecting to `wss://<project>.supabase.co/realtime/v1`. If you are, it could indicate a misconfiguration on the Supabase project.

* **Logs and monitoring:** Supabase provides some realtime debugging info. In the Supabase dashboard under **Logs**, you might see errors related to "realtime" or authentication. These can provide clues if the token was rejected or if there was some rule preventing replication. Also, ensure the table actually has changes – if the table is empty and no one has inserted new rows, there won't be any events to receive.

By following this guide and the best practices above, you should achieve a robust real-time setup with **Next.js 15 + Supabase + Clerk**. You’ll have a client that remains in sync with your database updates, and thanks to RLS, each user will only see the data they’re permitted to see. Happy coding!

**Sources:**

* Supabase Docs – *Enabling Postgres replication for Realtime*
* Supabase Docs – *Listening to Postgres Changes (v2 channel syntax)*
* Supabase Docs – *Using custom JWTs (Clerk) with Supabase*
* Supabase Docs – *Third-Party Auth (Clerk) and RLS guidance*
* Community Q\&A – *Common realtime issues (enabling replication, JWT auth)*
