'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import TestIntegrationClient from './test-integration-client';

export default function TestIntegrationPage() {
  const { isLoaded, userId } = useAuth();
  const [initialData, setInitialData] = useState<{
    initialTickets: any[];
    tenantData: any;
    connectionStatus: string;
    connectionTime: number;
  }>({
    initialTickets: [],
    tenantData: null,
    connectionStatus: 'disconnected',
    connectionTime: 0,
  });

  useEffect(() => {
    if (!isLoaded || !userId) return;

    const fetchInitialData = async () => {
      try {
        const response = await fetch('/api/test-integration');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch test data');
        }

        setInitialData({
          initialTickets: data.initialTickets,
          tenantData: data.tenantData,
          connectionStatus: data.connectionStatus,
          connectionTime: data.connectionTime,
        });
      } catch (error) {
        console.error('Database connection test failed:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          error: error,
        });

        setInitialData({
          initialTickets: [],
          tenantData: null,
          connectionStatus: 'error',
          connectionTime: 0,
        });
      }
    };

    fetchInitialData();
  }, [isLoaded, userId]);

  if (!isLoaded) {
    return (
      <div className='container mx-auto p-6'>
        <div className='text-center'>Loading...</div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className='container mx-auto p-6'>
        <div className='text-center'>Please sign in to access this page.</div>
      </div>
    );
  }

  return (
    <div className='min-h-screen overflow-y-auto' style={{ height: '100vh' }}>
      <div className='container mx-auto p-6 space-y-8 max-w-7xl pb-20'>
        <div className='border-b pb-4'>
          <h1 className='text-3xl font-bold'>Integration Test Page</h1>
          <p className='text-muted-foreground mt-2'>
            Comprehensive testing of Clerk JWT tokens and Supabase real-time
            functionality
          </p>
        </div>

        <TestIntegrationClient
          initialTickets={initialData.initialTickets}
          tenantData={initialData.tenantData}
          connectionStatus={initialData.connectionStatus}
          connectionTime={initialData.connectionTime}
        />
      </div>
    </div>
  );
}

