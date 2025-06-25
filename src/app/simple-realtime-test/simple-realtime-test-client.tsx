'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
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

interface RealtimeEvent {
  id: number;
  event: string;
  timestamp: string;
  data: TestData | null;
}

interface SimpleRealtimeTestClientProps {
  initialTestData: TestData[];
  tenantData: TenantData | null;
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
  const [jwtPayload, setJwtPayload] = useState<JWTPayload | null>(null);
  const [testData, setTestData] = useState<TestData[]>(initialTestData);
  const [realtimeStatus, setRealtimeStatus] = useState<
    'disconnected' | 'connected' | 'error' | 'connecting'
  >('disconnected');
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // JWT Token handling with modern 2025 pattern
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        setJwtToken(token);
        console.log('JWT Token obtained for real-time auth');

        if (token && typeof token === 'string') {
          // Decode and log JWT payload for debugging
          const tokenParts = token.split('.');
          if (tokenParts.length !== 3 || !tokenParts[1]) {
            console.error(
              '❌ Invalid JWT format - expected 3 parts separated by dots'
            );
            setRealtimeError('Invalid JWT token format');
            return;
          }

          let payload: JWTPayload;
          try {
            payload = JSON.parse(atob(tokenParts[1])) as JWTPayload;
            setJwtPayload(payload);
            console.log('JWT Payload:', payload);
            console.log('Tenant ID in JWT:', payload.tenant_id);
          } catch (parseError) {
            console.error('❌ Failed to parse JWT payload:', parseError);
            setRealtimeError('Failed to parse JWT token');
            return;
          }

          // Validate JWT for Supabase real-time
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp < now) {
            console.error('❌ JWT token is expired');
            setRealtimeError('JWT token is expired');
            return;
          }

          if (!payload.role) {
            console.error('❌ JWT token missing role claim');
            setRealtimeError('JWT token missing role claim');
            return;
          }

          console.log('✅ JWT token validation passed');
          console.log(
            'JWT expires at:',
            new Date(payload.exp * 1000).toISOString()
          );
          console.log('JWT role:', payload.role);

          // Modern 2025 pattern for Clerk + Supabase real-time
          console.log('Configuring JWT authentication for real-time');
          try {
            // For Clerk JWTs, we only need to set the real-time auth
            // Do NOT use supabase.auth.setSession() with Clerk tokens
            console.log('Setting JWT token for real-time authentication');
            supabase.realtime.setAuth(token);
            console.log(
              '✅ JWT authentication configured successfully for real-time'
            );
          } catch (authError) {
            console.error('Failed to set real-time authentication:', authError);
            setRealtimeError('Failed to configure real-time authentication');
          }
        }
      } catch (error) {
        console.error('Failed to fetch JWT token:', error);
        setRealtimeError('Failed to authenticate for real-time connection');
      }
    };

    if (userId && tenantData?.id) {
      fetchToken();
    }
  }, [getToken, userId, tenantData?.id]);

  // Modern 2025 real-time subscription pattern
  useEffect(() => {
    // Only proceed if we have both tenant data and JWT token
    if (!tenantData?.id || !jwtToken) {
      console.log('Waiting for tenant data and JWT token...', {
        tenantId: tenantData?.id,
        hasJwtToken: !!jwtToken,
      });
      setRealtimeStatus('disconnected');
      return;
    }

    console.log(
      'Setting up authenticated real-time subscription for tenant:',
      tenantData.id
    );

    // Clear previous errors
    setRealtimeError(null);
    setRealtimeStatus('connecting');

    // Setup subscription with proper timing
    const setupRealtimeSubscription = async () => {
      try {
        // Ensure authentication is set before creating subscription
        console.log('Setting auth token for real-time connection...');
        supabase.realtime.setAuth(jwtToken);

        // Small delay to ensure auth is processed
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Test basic connection first
        console.log('Testing basic real-time connection...');
        const testChannel = supabase.channel('connection-test');

        const connectionPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Connection test timed out'));
          }, 5000);

          testChannel.subscribe((status, err) => {
            clearTimeout(timeout);
            if (err) {
              reject(err);
            } else if (status === 'SUBSCRIBED') {
              resolve(status);
            } else if (status === 'CHANNEL_ERROR') {
              reject(new Error('Basic connection test failed'));
            }
          });
        });

        try {
          await connectionPromise;
          console.log('✅ Basic real-time connection successful');
          supabase.removeChannel(testChannel);
        } catch (connectionError) {
          console.error(
            '❌ Basic real-time connection failed:',
            connectionError
          );
          supabase.removeChannel(testChannel);
          const errorMessage =
            connectionError instanceof Error
              ? connectionError.message
              : String(connectionError);
          throw new Error(`Basic connection failed: ${errorMessage}`);
        }

        // Create channel with unique name including tenant for isolation
        const channelName = `realtime-test-${tenantData.id}`;
        console.log(`Creating real-time channel: ${channelName}`);
        console.log(`Filtering by tenant_id: ${tenantData.id}`);

        const channel = supabase
          .channel(channelName)
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
                  data: (payload.new || payload.old) as TestData,
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
          .subscribe((status, err) => {
            console.log('Real-time subscription status:', status, err);

            if (err) {
              console.error('Real-time subscription error:', err);
              setRealtimeError(`Subscription error: ${err.message || err}`);
              setRealtimeStatus('error');
            } else {
              setRealtimeError(null);

              if (status === 'SUBSCRIBED') {
                console.log('✅ Real-time subscription successful!');
                setRealtimeStatus('connected');
              } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Real-time channel error');
                setRealtimeError(
                  'Channel connection failed - check JWT authentication'
                );
                setRealtimeStatus('error');
              } else if (status === 'TIMED_OUT') {
                console.error('⏰ Real-time subscription timed out');
                setRealtimeError('Connection timed out');
                setRealtimeStatus('error');
              } else if (status === 'CLOSED') {
                console.log('🔌 Real-time connection closed');
                setRealtimeStatus('disconnected');
              } else {
                console.log(`🔄 Real-time status: ${status}`);
                setRealtimeStatus('connecting');
              }
            }
          });

        return channel;
      } catch (error) {
        console.error('Failed to setup real-time subscription:', error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setRealtimeError(`Setup failed: ${errorMessage}`);
        setRealtimeStatus('error');
        return null;
      }
    };

    // Execute the setup
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const initializeSubscription = async () => {
      channel = await setupRealtimeSubscription();
    };

    initializeSubscription();

    return () => {
      console.log('Cleaning up real-time subscription');
      if (channel) {
        supabase.removeChannel(channel);
      }
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
            ) : realtimeStatus === 'connecting' ? (
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
                    realtimeStatus === 'connected'
                      ? 'default'
                      : realtimeStatus === 'connecting'
                      ? 'secondary'
                      : 'destructive'
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

            {realtimeError && (
              <Alert>
                <XCircle className='h-4 w-4' />
                <AlertDescription>
                  <strong>Real-time Error:</strong> {realtimeError}
                </AlertDescription>
              </Alert>
            )}

            {realtimeStatus === 'connected' && (
              <Alert>
                <CheckCircle className='h-4 w-4' />
                <AlertDescription>
                  ✅ Real-time connection established successfully with JWT
                  authentication!
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
                {realtimeStatus === 'connected' ? (
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
                  <strong>Real-time Status:</strong> {realtimeStatus}
                </div>
                <div>
                  <strong>Real-time Error:</strong> {realtimeError || 'None'}
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
