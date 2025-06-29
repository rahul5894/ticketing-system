import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabaseClient();

  const { data: user, error } = await supabase
    .from('users')
    .select('*, tenant:tenants(*)')
    .eq('clerk_id', userId)
    .single();

  if (error)
    return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      clerk_id: user.clerk_id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      status: user.status,
      tenant_id: user.tenant_id,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
    },
    tenant: user.tenant || null,
  });
}
