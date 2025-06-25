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

export async function POST(request: NextRequest) {
  try {
    const { message, tenantId, userId, userName } = await request.json();

    if (!message || !tenantId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert test data into realtime_test table
    const { data, error } = await serviceSupabase
      .from('realtime_test')
      .insert({
        tenant_id: tenantId,
        message: message,
        created_by: userName || userId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert test data: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Test data inserted successfully',
    });
  } catch (error) {
    console.error('Failed to insert test data:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { tenantId } = await request.json();

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Missing tenant ID' },
        { status: 400 }
      );
    }

    // Delete all test data for the tenant
    const { error } = await serviceSupabase
      .from('realtime_test')
      .delete()
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to clear test data: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Test data cleared successfully',
    });
  } catch (error) {
    console.error('Failed to clear test data:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
