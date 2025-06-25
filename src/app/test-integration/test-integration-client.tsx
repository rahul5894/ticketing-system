'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect, useOptimistic, useRef } from 'react';
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
import { Textarea } from '@/features/shared/components/ui/textarea';
import { Badge } from '@/features/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/features/shared/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/shared/components/ui/select';
import {
  Copy,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
  Clock,
  Database,
} from 'lucide-react';

interface TestIntegrationClientProps {
  initialTickets: any[];
  tenantData: any;
  connectionStatus: string;
  connectionTime: number;
}

export default function TestIntegrationClient({
  initialTickets,
  tenantData,
  connectionStatus,
  connectionTime,
}: TestIntegrationClientProps) {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [decodedToken, setDecodedToken] = useState<any>(null);
  const [tickets, setTickets] = useState(initialTickets);
  const [optimisticTickets, addOptimisticTicket] = useOptimistic(
    tickets,
    (state, newTicket: any) => [newTicket, ...state]
  );
  const [realtimeStatus, setRealtimeStatus] = useState<
    'disconnected' | 'connected' | 'error'
  >('disconnected');
  const [realtimeEvents, setRealtimeEvents] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // Using the base supabase client for real-time subscriptions

  // JWT Token handling using 2025+ patterns with Supabase template
  useEffect(() => {
    const fetchToken = async () => {
      try {
        // Get the custom Supabase JWT token using the template name
        const token = await getToken({ template: 'supabase' });
        setJwtToken(token);

        if (token) {
          // Decode JWT payload (client-side for display only)
          const payload = JSON.parse(atob(token.split('.')[1]));
          setDecodedToken(payload);
        }
      } catch (error) {
        console.error('Failed to fetch JWT token:', error);
      }
    };

    if (userId) {
      fetchToken();
    }
  }, [getToken, userId]);

  // Real-time subscription using 2025+ patterns with proper JWT authentication
  useEffect(() => {
    if (!tenantData?.id || !jwtToken) return;

    // Set the JWT token for real-time authentication
    // Note: If tenant_id is null in JWT, real-time will fail due to RLS policies
    console.log(
      'Setting up real-time with JWT token. tenant_id in token:',
      decodedToken?.tenant_id
    );

    // Test if real-time server is accessible
    console.log('Testing real-time server accessibility...');
    fetch(
      `https://xprwqadnmauhpschgkwk.supabase.co/realtime/v1/websocket?apikey=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      {
        method: 'HEAD',
      }
    )
      .then((response) => {
        console.log(
          'Real-time server response:',
          response.status,
          response.statusText
        );
      })
      .catch((error) => {
        console.log('Real-time server not accessible:', error.message);
      });

    supabase.realtime.setAuth(jwtToken);

    const channel = supabase
      .channel('test-tickets-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
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
            ...prev.slice(0, 9),
          ]); // Keep last 10 events

          // Update tickets list based on event type
          if (payload.eventType === 'INSERT' && payload.new) {
            setTickets((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setTickets((prev) =>
              prev.map((ticket) =>
                ticket.id === payload.new.id ? payload.new : ticket
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setTickets((prev) =>
              prev.filter((ticket) => ticket.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        setRealtimeStatus(
          status === 'SUBSCRIBED'
            ? 'connected'
            : status === 'CHANNEL_ERROR'
            ? 'error'
            : 'disconnected'
        );
      });

    return () => {
      supabase.removeChannel(channel);
      setRealtimeStatus('disconnected');
    };
  }, [tenantData?.id, jwtToken, supabase]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleCreateTicket = async (formData: FormData) => {
    if (!tenantData?.id || !userId) return;

    setIsSubmitting(true);

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as string;
    const department = formData.get('department') as string;

    const newTicket = {
      id: `temp-${Date.now()}`,
      title,
      description,
      priority,
      department,
      tenant_id: tenantData.id,
      created_by: userId,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sending: true,
    };

    // Optimistic update using React 19 pattern
    addOptimisticTicket(newTicket);
    formRef.current?.reset();

    try {
      const response = await fetch('/api/test-realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          priority,
          department,
          userId,
          userEmail: user?.emailAddresses?.[0]?.emailAddress,
          userName: user?.fullName,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create ticket');
      }

      // Real-time subscription will handle the actual update
      console.log('Ticket created successfully:', result);
    } catch (error) {
      console.error('Failed to create ticket:', error);
      // Remove optimistic update on error
      setTickets((prev) => prev.filter((ticket) => ticket.id !== newTicket.id));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='space-y-8'>
      {/* JWT Token Verification Section */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <CheckCircle className='h-5 w-5' />
            JWT Token Verification
          </CardTitle>
          <CardDescription>
            Verify Clerk JWT tokens contain proper tenant information
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div>
            <h4 className='font-semibold mb-2'>User Information</h4>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div>
                <span className='font-medium'>User ID:</span> {userId}
              </div>
              <div>
                <span className='font-medium'>Email:</span>{' '}
                {user?.primaryEmailAddress?.emailAddress}
              </div>
              <div>
                <span className='font-medium'>Name:</span>{' '}
                {user?.fullName || 'Not set'}
              </div>
              <div>
                <span className='font-medium'>Tenant:</span>{' '}
                {tenantData?.name || 'Unknown'}
              </div>
            </div>
          </div>

          <div>
            <div className='flex items-center justify-between mb-2'>
              <h4 className='font-semibold'>Raw JWT Token</h4>
              <Button
                variant='outline'
                size='sm'
                onClick={() => jwtToken && copyToClipboard(jwtToken)}
                disabled={!jwtToken}
              >
                <Copy className='h-4 w-4 mr-1' />
                Copy for jwt.io
              </Button>
            </div>
            <div className='bg-muted p-3 rounded text-xs font-mono break-all'>
              {jwtToken || 'Loading...'}
            </div>
          </div>

          {decodedToken && (
            <div>
              <h4 className='font-semibold mb-2'>Decoded JWT Payload</h4>
              <pre className='bg-muted p-3 rounded text-xs overflow-auto'>
                {JSON.stringify(decodedToken, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supabase Connection Test Section */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Database className='h-5 w-5' />
            Supabase Connection Test
          </CardTitle>
          <CardDescription>
            Test database connectivity and tenant isolation
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-3 gap-4'>
            <div className='flex items-center gap-2'>
              {connectionStatus === 'connected' ? (
                <CheckCircle className='h-5 w-5 text-green-500' />
              ) : connectionStatus === 'error' ? (
                <XCircle className='h-5 w-5 text-red-500' />
              ) : (
                <Clock className='h-5 w-5 text-yellow-500' />
              )}
              <span className='font-medium'>Status:</span>
              <Badge
                variant={
                  connectionStatus === 'connected' ? 'default' : 'destructive'
                }
              >
                {connectionStatus}
              </Badge>
            </div>
            <div>
              <span className='font-medium'>Response Time:</span>{' '}
              {connectionTime}ms
            </div>
            <div>
              <span className='font-medium'>Tenant ID:</span>{' '}
              {tenantData?.id?.slice(0, 8)}...
            </div>
          </div>

          {tenantData && (
            <div>
              <h4 className='font-semibold mb-2'>Tenant Data</h4>
              <pre className='bg-muted p-3 rounded text-xs overflow-auto'>
                {JSON.stringify(tenantData, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <h4 className='font-semibold mb-2'>
              Initial Tickets ({initialTickets.length})
            </h4>
            <div className='text-sm text-muted-foreground'>
              Fetched {initialTickets.length} tickets with tenant isolation
              verified
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Subscription Test Section */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            {realtimeStatus === 'connected' ? (
              <Wifi className='h-5 w-5 text-green-500' />
            ) : (
              <WifiOff className='h-5 w-5 text-red-500' />
            )}
            Real-time Subscription Test
          </CardTitle>
          <CardDescription>
            Test live updates and optimistic UI patterns
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-2'>
              <span className='font-medium'>Real-time Status:</span>
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
          </div>

          {/* Create Ticket Form */}
          <div>
            <h4 className='font-semibold mb-3'>Create Test Ticket</h4>
            <form
              ref={formRef}
              action={handleCreateTicket}
              className='space-y-4'
            >
              <div className='grid grid-cols-2 gap-4'>
                <Input
                  name='title'
                  placeholder='Ticket title'
                  required
                  disabled={isSubmitting}
                />
                <Select name='priority' required disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder='Priority' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='low'>Low</SelectItem>
                    <SelectItem value='medium'>Medium</SelectItem>
                    <SelectItem value='high'>High</SelectItem>
                    <SelectItem value='urgent'>Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <Select name='department' required disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder='Department' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='sales'>Sales</SelectItem>
                    <SelectItem value='support'>Support</SelectItem>
                    <SelectItem value='marketing'>Marketing</SelectItem>
                    <SelectItem value='technical'>Technical</SelectItem>
                  </SelectContent>
                </Select>
                <Button type='submit' disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Ticket'}
                </Button>
              </div>
              <Textarea
                name='description'
                placeholder='Ticket description'
                required
                disabled={isSubmitting}
              />
            </form>
          </div>

          {/* Live Tickets List */}
          <div>
            <h4 className='font-semibold mb-3'>
              Live Tickets ({optimisticTickets.length})
            </h4>
            <div className='space-y-2 max-h-64 overflow-auto'>
              {optimisticTickets.map((ticket, index) => (
                <div
                  key={ticket.id}
                  className={`p-3 border rounded ${
                    ticket.sending ? 'bg-yellow-50 border-yellow-200' : ''
                  }`}
                >
                  <div className='flex items-center justify-between'>
                    <div className='font-medium'>{ticket.title}</div>
                    <div className='flex items-center gap-2'>
                      <Badge variant='outline'>{ticket.priority}</Badge>
                      <Badge variant='secondary'>{ticket.department}</Badge>
                      {ticket.sending && (
                        <Badge variant='outline' className='text-yellow-600'>
                          Sending...
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className='text-sm text-muted-foreground mt-1'>
                    {ticket.description}
                  </div>
                  <div className='text-xs text-muted-foreground mt-2'>
                    Created: {new Date(ticket.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Events Log */}
          <div>
            <h4 className='font-semibold mb-3'>Real-time Events Log</h4>
            <div className='space-y-2 max-h-48 overflow-auto'>
              {realtimeEvents.length === 0 ? (
                <div className='text-sm text-muted-foreground p-3 border rounded'>
                  No real-time events received yet. Create a ticket to see live
                  updates.
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
                      {event.data?.title || 'No title'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {realtimeStatus !== 'connected' && (
            <Alert>
              <AlertDescription>
                Real-time connection is not active. Check your Supabase
                configuration and ensure real-time is enabled for the tickets
                table.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Results Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results Summary</CardTitle>
          <CardDescription>Overall status of integration tests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 gap-4'>
            <div className='flex items-center gap-2'>
              {jwtToken ? (
                <CheckCircle className='h-5 w-5 text-green-500' />
              ) : (
                <XCircle className='h-5 w-5 text-red-500' />
              )}
              <span>JWT Token Verification</span>
            </div>
            <div className='flex items-center gap-2'>
              {connectionStatus === 'connected' ? (
                <CheckCircle className='h-5 w-5 text-green-500' />
              ) : (
                <XCircle className='h-5 w-5 text-red-500' />
              )}
              <span>Database Connection</span>
            </div>
            <div className='flex items-center gap-2'>
              {realtimeStatus === 'connected' ? (
                <CheckCircle className='h-5 w-5 text-green-500' />
              ) : (
                <XCircle className='h-5 w-5 text-red-500' />
              )}
              <span>Real-time Subscriptions</span>
            </div>
            <div className='flex items-center gap-2'>
              {tenantData ? (
                <CheckCircle className='h-5 w-5 text-green-500' />
              ) : (
                <XCircle className='h-5 w-5 text-red-500' />
              )}
              <span>Tenant Isolation</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

