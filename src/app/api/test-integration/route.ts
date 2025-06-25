import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create service role client for admin operations
const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET() {
  try {
    const startTime = Date.now();

    // Test tenant data fetch
    const { data: tenants, error: tenantError } = await serviceSupabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'quantumnest');

    if (tenantError) throw tenantError;

    if (!tenants || tenants.length === 0) {
      throw new Error('No tenant found with subdomain "quantumnest"');
    }

    const tenantData = tenants[0];

    // Test tickets fetch with tenant isolation
    const { data: tickets, error: ticketsError } = await serviceSupabase
      .from('tickets')
      .select(`
        *,
        created_by:users!tickets_created_by_fkey(id, email, first_name, last_name)
      `)
      .eq('tenant_id', tenantData.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (ticketsError) throw ticketsError;

    const connectionTime = Date.now() - startTime;

    return NextResponse.json({
      connectionStatus: 'connected',
      connectionTime,
      tenantData,
      initialTickets: tickets || [],
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    
    return NextResponse.json(
      {
        connectionStatus: 'error',
        connectionTime: 0,
        tenantData: null,
        initialTickets: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
