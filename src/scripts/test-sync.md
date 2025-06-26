# Clerk-Supabase Sync Test Guide

## Testing the Complete Sync Flow

### Prerequisites
1. Ensure you're logged into Clerk as a Super Admin
2. Make sure you're accessing the app from the correct subdomain (quantumnest.localhost:3000)
3. Have Supabase dashboard open to verify data creation

### Test Steps

#### 1. Initial Login Test
1. Navigate to `http://quantumnest.localhost:3000/tickets`
2. Log in with your Super Admin account
3. Check the sync status indicator in the left sidebar
4. Expected behavior:
   - Sync indicator should show "Syncing..." briefly
   - Then show "Synced" or success message
   - Debug info should show sync status details

#### 2. Verify Supabase Data Creation
1. Open Supabase dashboard
2. Navigate to Table Editor
3. Check `tenants` table:
   - Should contain a row with `id` = "quantumnest"
   - `name` = "Quantum Nest"
   - `subdomain` = "quantumnest"
   - `status` = "active"
4. Check `users` table:
   - Should contain a row with your Clerk user data
   - `clerk_id` = your Clerk user ID
   - `tenant_id` = "quantumnest"
   - `role` = "super_admin" (or your assigned role)

#### 3. Test Data Switching
1. After successful sync, the app should:
   - Switch from mock data to real Supabase data
   - Show empty ticket list (since no real tickets exist yet)
   - Display "No tickets found" message

#### 4. Test Ticket Creation
1. Click "Create New Ticket" button (should be visible for Super Admin)
2. Fill out the form:
   - Title: "Test Sync Ticket"
   - Description: "Testing the sync functionality"
   - Priority: "High"
   - Department: "Technical"
3. Submit the ticket
4. Expected behavior:
   - Ticket should be created in Supabase
   - Should appear in the Recent Tickets list
   - Real-time subscription should update the UI

#### 5. Verify Real-Time Updates
1. Open Supabase dashboard
2. Navigate to `tickets` table
3. Verify the test ticket was created with:
   - Correct tenant_id ("quantumnest")
   - Your user_id as the creator
   - All form data properly saved

### Troubleshooting

#### If Sync Fails
1. Check browser console for error messages
2. Verify Clerk organization membership
3. Check Supabase RLS policies are properly configured
4. Ensure environment variables are set correctly

#### If Mock Data Still Shows
1. Check sync status in debug info
2. Verify `useMockData` is set to `false` in store
3. Check if sync completed successfully

#### If Tickets Don't Create
1. Verify user has "tickets.create" permission
2. Check API route logs for errors
3. Ensure tenant_id is correctly passed

### Expected Final State
After successful testing:
- Tenant "quantumnest" exists in Supabase
- Your user account is synced to Supabase
- App shows real data instead of mock data
- Ticket creation works end-to-end
- Real-time updates function properly

### Manual Sync Trigger
If automatic sync fails, you can trigger manual sync by:
1. Opening browser dev tools
2. Going to Console
3. Running: `fetch('/api/sync', { method: 'POST' })`
4. Check the response for sync results
