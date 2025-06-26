'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/lib/supabase-client';
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/features/shared/components/ui/card';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Badge } from '@/features/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/features/shared/components/ui/alert';
import {
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
  Send,
  Trash2,
} from 'lucide-react';

interface TestData {
  id: string;
  tenant_id: string;
  message: string;
  created_by: string | null;
  created_at: string;
  [key: string]: unknown;
}

interface TenantData {
  id: string;
  name: string;
  subdomain: string;
  status: string;
}

interface JWTPayload {
  sub: string;
  email: string;
  tenant_id: string;
  role: string;
  exp: number;
  iat: number;
}

export default function SimpleRealtimeTestClient() {
  const { getToken, userId, isLoaded } = useAuth();
  const { user } = useUser();
  const { client: supabase } = useSupabaseClient();
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [jwtPayload, setJwtPayload] = useState<JWTPayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [testDataError, setTestDataError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!isLoaded || !supabase) return;

      if (!userId) {
        window.location.href = '/sign-in';
        return;
      }

      try {
        const hostname = window.location.hostname;
        const subdomainParts = hostname.split('.');
        const subdomain = subdomainParts[0] || 'localhost';

        if (!subdomain || subdomain === 'localhost') {
          const defaultTenant: TenantData = {
            id: 'quantumnest',
            name: 'QuantumNest',
            subdomain: 'quantumnest',
            status: 'active',
          };
          setTenantData(defaultTenant);
        } else {
          const tenantData: TenantData = {
            id: subdomain,
            name: subdomain.charAt(0).toUpperCase() + subdomain.slice(1),
            subdomain: subdomain,
            status: 'active',
          };
          setTenantData(tenantData);
        }

        const tenantId = subdomain === 'localhost' ? 'quantumnest' : subdomain;
        const { error: testDataError } = await supabase
          .from('realtime_test')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(10);

        setTestDataError(testDataError?.message || null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setTestDataError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isLoaded, userId, supabase]);

  // Modern 2025 real-time subscription with automatic reconnection
  const {
    connectionState,
    data: realtimeData,
    events: realtimeEvents,
  } = useRealtimeSubscription<TestData>(
    {
      table: 'realtime_test',
      ...(tenantData?.id && { filter: `tenant_id=eq.${tenantData.id}` }),
    },
    tenantData?.id || null,
    !!tenantData?.id
  );

  // The useRealtimeSubscription hook now manages the data state internally.
  const testData = realtimeData;

  // JWT Token handling for display purposes only
  useEffect(() => {
    const fetchTokenForDisplay = async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        setJwtToken(token);

        if (token && typeof token === 'string') {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3 && tokenParts[1]) {
            try {
              const payload = JSON.parse(atob(tokenParts[1])) as JWTPayload;
              setJwtPayload(payload);
            } catch {
              // Silent error handling
            }
          }
        }
      } catch {
        // Silent error handling
      }
    };

    if (userId && tenantData?.id) {
      fetchTokenForDisplay();
    }
  }, [getToken, userId, tenantData?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !tenantData?.id || !userId) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/simple-realtime-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          tenantId: tenantData.id,
          userId,
          userName: user?.fullName || 'Unknown User',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send message');
      }

      setMessage('');
    } catch {
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearData = async () => {
    if (!tenantData?.id) return;

    try {
      const response = await fetch('/api/simple-realtime-test', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: tenantData.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to clear data');
      }
      // Optimistically clear the local state by re-fetching
      // This is a simple approach for this test page.
      // In a real app, you might update the local state directly.
      const { error: testDataError } = await supabase
        .from('realtime_test')
        .select('*')
        .eq('tenant_id', tenantData.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setTestDataError(testDataError?.message || null);
    } catch {
      alert('Failed to clear data. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <p>Loading real-time data...</p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {testDataError && (
        <Alert>
          <XCircle className='h-4 w-4' />
          <AlertDescription>
            Error loading test data: {testDataError}
          </AlertDescription>
        </Alert>
      )}

      {/* JWT Payload Display */}
      <Card>
        <CardHeader>
          <CardTitle>JWT Token Payload</CardTitle>
          <CardDescription>
            Decoded JWT payload showing tenant identification and claims
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jwtPayload ? (
            <div className='space-y-3'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <span className='font-medium text-sm'>Tenant ID:</span>
                  <div
                    className='p-2 bg-muted rounded text-sm font-mono'
                    data-testid='jwt-tenant-id'
                  >
                    {jwtPayload.tenant_id || 'Not set'}
                  </div>
                </div>
                <div>
                  <span className='font-medium text-sm'>User ID:</span>
                  <div className='p-2 bg-muted rounded text-sm font-mono'>
                    {jwtPayload.sub || 'Not set'}
                  </div>
                </div>
                <div>
                  <span className='font-medium text-sm'>Email:</span>
                  <div className='p-2 bg-muted rounded text-sm'>
                    {jwtPayload.email || 'Not set'}
                  </div>
                </div>
                <div>
                  <span className='font-medium text-sm'>Role:</span>
                  <div className='p-2 bg-muted rounded text-sm'>
                    {jwtPayload.role || 'Not set'}
                  </div>
                </div>
              </div>
              <details className='mt-4'>
                <summary className='cursor-pointer font-medium text-sm mb-2'>
                  Full JWT Payload (Click to expand)
                </summary>
                <pre
                  className='p-3 bg-muted rounded text-xs overflow-auto max-h-40'
                  data-testid='jwt-full-payload'
                >
                  {JSON.stringify(jwtPayload, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div className='text-sm text-muted-foreground p-3 border rounded'>
              JWT token not available yet...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time Status */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            {connectionState.status === 'connected' ? (
              <Wifi className='h-5 w-5 text-green-500' />
            ) : connectionState.status === 'connecting' ? (
              <Wifi className='h-5 w-5 text-yellow-500 animate-pulse' />
            ) : (
              <WifiOff className='h-5 w-5 text-red-500' />
            )}
            Real-time Connection Status
          </CardTitle>
          <CardDescription>
            Testing modern 2025 Supabase real-time with JWT authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex items-center gap-4 flex-wrap'>
              <div className='flex items-center gap-2'>
                <span className='font-medium'>Status:</span>
                <Badge
                  variant={
                    connectionState.status === 'connected'
                      ? 'default'
                      : connectionState.status === 'connecting'
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {connectionState.status}
                </Badge>
              </div>
              <div className='text-sm text-muted-foreground'>
                Events received: {realtimeEvents.length}
              </div>
              <div className='text-sm text-muted-foreground'>
                Test records: {testData.length}
              </div>
              <div
                className='text-sm text-muted-foreground'
                data-testid='tenant-info'
              >
                Tenant: {tenantData?.id || 'Unknown'}
              </div>
              {connectionState.reconnectAttempts > 0 && (
                <div className='text-sm text-muted-foreground'>
                  Reconnect attempts: {connectionState.reconnectAttempts}
                </div>
              )}
            </div>

            {connectionState.error && (
              <Alert>
                <XCircle className='h-4 w-4' />
                <AlertDescription>
                  <strong>Real-time Error:</strong>{' '}
                  {connectionState.error.message}
                </AlertDescription>
              </Alert>
            )}

            {connectionState.status === 'connected' && (
              <Alert>
                <CheckCircle className='h-4 w-4' />
                <AlertDescription>
                  ✅ Real-time connection established with automatic
                  reconnection!
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Message Input */}
      <Card>
        <CardHeader>
          <CardTitle>Send Test Message</CardTitle>
          <CardDescription>
            Send a message to test real-time updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendMessage} className='flex gap-2'>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder='Enter a test message...'
              disabled={isSubmitting}
              className='flex-1'
            />
            <Button type='submit' disabled={isSubmitting || !message.trim()}>
              <Send className='h-4 w-4 mr-2' />
              {isSubmitting ? 'Sending...' : 'Send'}
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={handleClearData}
              disabled={testData.length === 0}
            >
              <Trash2 className='h-4 w-4 mr-2' />
              Clear All
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Test Data Display */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Current Test Data */}
        <Card>
          <CardHeader>
            <CardTitle>Test Data ({testData.length})</CardTitle>
            <CardDescription>
              Current records in the realtime_test table
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-2 max-h-64 overflow-auto'>
              {testData.length === 0 ? (
                <div className='text-sm text-muted-foreground p-3 border rounded'>
                  No test data yet. Send a message to see real-time updates.
                </div>
              ) : (
                testData.map((item) => (
                  <div key={item.id} className='p-3 border rounded'>
                    <div className='font-medium'>{item.message}</div>
                    <div className='text-xs text-muted-foreground mt-1'>
                      {new Date(item.created_at).toLocaleString()} •{' '}
                      {item.created_by || 'Unknown'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Real-time Events Log */}
        <Card>
          <CardHeader>
            <CardTitle>Real-time Events</CardTitle>
            <CardDescription>
              Live events received from Supabase real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-2 max-h-64 overflow-auto'>
              {realtimeEvents.length === 0 ? (
                <div className='text-sm text-muted-foreground p-3 border rounded'>
                  No real-time events received yet.
                </div>
              ) : (
                realtimeEvents.map((event) => (
                  <div key={event.id} className='p-2 border rounded text-xs'>
                    <div className='flex items-center justify-between'>
                      <Badge variant='outline'>{event.type}</Badge>
                      <span className='text-muted-foreground'>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className='mt-1 font-mono text-xs'>
                      {(event.payload.new as TestData)?.message ||
                        (event.payload.old as TestData)?.message ||
                        'No message'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Test Summary</CardTitle>
          <CardDescription>Overall status of real-time testing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='flex items-center gap-2'>
                {jwtToken ? (
                  <CheckCircle className='h-5 w-5 text-green-500' />
                ) : (
                  <XCircle className='h-5 w-5 text-red-500' />
                )}
                <span>JWT Authentication</span>
              </div>
              <div className='flex items-center gap-2'>
                {connectionState.status === 'connected' ? (
                  <CheckCircle className='h-5 w-5 text-green-500' />
                ) : (
                  <XCircle className='h-5 w-5 text-red-500' />
                )}
                <span>Real-time Connection</span>
              </div>
            </div>

            {/* Debug Information */}
            <details className='mt-4'>
              <summary className='cursor-pointer font-medium text-sm mb-2'>
                Debug Information (Click to expand)
              </summary>
              <div className='p-3 bg-muted rounded text-xs space-y-2'>
                <div>
                  <strong>Tenant ID:</strong> {tenantData?.id || 'Not set'}
                </div>
                <div>
                  <strong>User ID:</strong> {userId || 'Not set'}
                </div>
                <div>
                  <strong>JWT Token:</strong>{' '}
                  {jwtToken ? 'Available' : 'Not available'}
                </div>
                <div>
                  <strong>JWT Tenant Claim:</strong>{' '}
                  {jwtPayload?.tenant_id || 'Not set'}
                </div>
                <div>
                  <strong>Real-time Status:</strong> {connectionState.status}
                </div>
                <div>
                  <strong>Real-time Error:</strong>{' '}
                  {connectionState.error?.message || 'None'}
                </div>
                <div>
                  <strong>Reconnect Attempts:</strong>{' '}
                  {connectionState.reconnectAttempts}
                </div>
                <div>
                  <strong>Events Received:</strong> {realtimeEvents.length}
                </div>
                <div>
                  <strong>Test Records:</strong> {testData.length}
                </div>
              </div>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
