'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import SimpleRealtimeTestClient from './simple-realtime-test-client';

interface TestData {
  id: string;
  tenant_id: string;
  message: string;
  created_by: string | null;
  created_at: string;
}

interface TenantData {
  id: string;
  name: string;
  subdomain: string;
  status: string;
}

export default function SimpleRealtimeTestPage() {
  const { isLoaded, userId } = useAuth();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [initialTestData, setInitialTestData] = useState<TestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!isLoaded) return;

      if (!userId) {
        window.location.href = '/sign-in';
        return;
      }

      try {
        // Extract subdomain from URL for tenant identification
        const hostname = window.location.hostname;
        const subdomainParts = hostname.split('.');
        const subdomain = subdomainParts[0] || 'localhost'; // Default to 'localhost' if no subdomain

        // Validate subdomain
        if (!subdomain || subdomain === 'localhost') {
          // For localhost development, use a default tenant
          const defaultTenant: TenantData = {
            id: 'quantumnest',
            name: 'QuantumNest',
            subdomain: 'quantumnest',
            status: 'active',
          };
          setTenant(defaultTenant);
        } else {
          // Use subdomain-based tenant data (TEXT-based tenant_id)
          const tenantData: TenantData = {
            id: subdomain,
            name: subdomain.charAt(0).toUpperCase() + subdomain.slice(1),
            subdomain: subdomain,
            status: 'active',
          };
          setTenant(tenantData);
        }

        // Get initial test data using TEXT-based tenant_id
        const tenantId = subdomain === 'localhost' ? 'quantumnest' : subdomain;
        const { data: testData, error: testDataError } = await supabase
          .from('realtime_test')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(10);

        setInitialTestData(testData || []);
        setError(testDataError?.message || null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isLoaded, userId]);

  if (!isLoaded || loading) {
    return (
      <div className='container mx-auto p-8'>
        <div className='text-center'>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='container mx-auto p-8'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-600 mb-4'>Error</h1>
          <p className='text-muted-foreground'>{error}</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className='container mx-auto p-8'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-600 mb-4'>
            Tenant Not Found
          </h1>
          <p className='text-muted-foreground'>
            Could not find the test tenant. Please check your configuration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto p-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold mb-2'>Simple Real-time Test</h1>
        <p className='text-muted-foreground'>
          Basic real-time functionality testing with minimal complexity
        </p>
      </div>

      <SimpleRealtimeTestClient
        initialTestData={initialTestData}
        tenantData={tenant}
        testDataError={error}
      />
    </div>
  );
}
