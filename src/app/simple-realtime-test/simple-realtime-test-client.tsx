'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
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
}

interface SimpleRealtimeTestClientProps {
  initialTestData: TestData[];
  tenantData: any;
  testDataError: string | null;
}

export default function SimpleRealtimeTestClient({
  initialTestData,
  tenantData,
  testDataError,
}: SimpleRealtimeTestClientProps) {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [jwtPayload, setJwtPayload] = useState<any>(null);
  const [testData, setTestData] = useState<TestData[]>(initialTestData);
  const [realtimeStatus, setRealtimeStatus] = useState<
    'disconnected' | 'connected' | 'error'
  >('disconnected');
  const [realtimeEvents, setRealtimeEvents] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  // JWT Token handling
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        setJwtToken(token);
        console.log('JWT Token obtained for real-time auth');

        if (token) {
          // Decode and log JWT payload for debugging
          const payload = JSON.parse(atob(token.split('.')[1]));
          setJwtPayload(payload);
          console.log('JWT Payload:', payload);
          console.log('Tenant ID in JWT:', payload.tenant_id);

          // If JWT doesn't have tenant_id, try to set it from subdomain
          if (!payload.tenant_id && tenantData?.id) {
            console.warn(
              'JWT missing tenant_id, using subdomain fallback:',
              tenantData.id
            );
            // Note: This is for debugging only - real fix needed in Clerk JWT template
          }
        }
      } catch (error) {
        console.error('Failed to fetch JWT token:', error);
      }
    };

    if (userId) {
      fetchToken();
    }
  }, [getToken, userId]);

  // Real-time subscription
  useEffect(() => {
    if (!tenantData?.id) {
      console.log('Missing tenant ID for real-time');
      return;
    }

    console.log(
      'Setting up real-time subscription for tenant (subdomain):',
      tenantData.id
    );

    // For testing, we'll try both with and without JWT authentication
    if (jwtToken) {
      console.log('Setting JWT token for real-time auth');
      supabase.realtime.setAuth(jwtToken);
    } else {
      console.log('No JWT token available, using anonymous connection');
    }

    const channel = supabase
      .channel('simple-realtime-test')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'realtime_test',
          filter: `tenant_id=eq.${tenantData.id}`,
        },
        (payload) => {
          console.log('Real-time event received:', payload);

          // Add event to log
          setRealtimeEvents((prev) => [
            {
              id: Date.now(),
              event: payload.eventType,
              timestamp: new Date().toISOString(),
              data: payload.new || payload.old,
            },
            ...prev.slice(0, 9), // Keep last 10 events
          ]);

          // Update test data based on event type
          if (payload.eventType === 'INSERT' && payload.new) {
            setTestData((prev) => [payload.new as TestData, ...prev]);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setTestData((prev) =>
              prev.filter((item) => item.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        setRealtimeStatus(
          status === 'SUBSCRIBED'
            ? 'connected'
            : status === 'CHANNEL_ERROR'
            ? 'error'
            : 'disconnected'
        );
      });

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
      setRealtimeStatus('disconnected');
    };
  }, [tenantData?.id, jwtToken]);

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
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Failed to send message:', error);
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

      console.log('Test data cleared successfully');
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('Failed to clear data. Please try again.');
    }
  };

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
            {realtimeStatus === 'connected' ? (
              <Wifi className='h-5 w-5 text-green-500' />
            ) : (
              <WifiOff className='h-5 w-5 text-red-500' />
            )}
            Real-time Connection Status
          </CardTitle>
          <CardDescription>
            Testing basic real-time functionality with minimal setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-2'>
              <span className='font-medium'>Status:</span>
              <Badge
                variant={
                  realtimeStatus === 'connected' ? 'default' : 'destructive'
                }
              >
                {realtimeStatus}
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
                      <Badge variant='outline'>{event.event}</Badge>
                      <span className='text-muted-foreground'>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className='mt-1 font-mono text-xs'>
                      {event.data?.message || 'No message'}
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
              {realtimeStatus === 'connected' ? (
                <CheckCircle className='h-5 w-5 text-green-500' />
              ) : (
                <XCircle className='h-5 w-5 text-red-500' />
              )}
              <span>Real-time Connection</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

