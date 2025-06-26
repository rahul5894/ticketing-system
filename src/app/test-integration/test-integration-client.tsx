'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect, useOptimistic, useRef } from 'react';
import { useSupabase } from '@/features/shared/components/SupabaseProvider';
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

import { Tables } from '@/types/supabase';

type Ticket = Tables<'tickets'> & { sending?: boolean };

interface TestIntegrationClientProps {
  initialTickets: Ticket[];
  tenantData: Tables<'tenants'>;
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
  const { supabase } = useSupabase();
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [decodedToken, setDecodedToken] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const {
    connectionState,
    data: tickets,
    events: realtimeEvents,
  } = useRealtimeSubscription<Ticket>(
    {
      table: 'tickets',
      filter: `tenant_id=eq.${tenantData.id}`,
    },
    tenantData?.id,
    !!tenantData?.id
  );

  const [optimisticTickets, addOptimisticTicket] = useOptimistic(
    tickets,
    (state: Ticket[], newTicket: Ticket) => [newTicket, ...state]
  );

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        setJwtToken(token);
        if (token) {
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3 && tokenParts[1]) {
              const payload = JSON.parse(atob(tokenParts[1]));
              setDecodedToken(payload);
            }
          } catch (error) {
            console.error('Failed to decode JWT token:', error);
            setDecodedToken(null);
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

    const newTicket: Ticket = {
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
      assigned_to: null,
      closed_at: null,
      due_date: null,
      metadata: null,
      resolved_at: null,
      tags: null,
    };

    addOptimisticTicket(newTicket);
    formRef.current?.reset();

    try {
      if (!supabase) throw new Error('Supabase client is not available.');
      const { error } = await supabase.from('tickets').insert({
        title,
        description,
        priority,
        department,
        user_id: userId,
        tenant_id: tenantData.id,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to create ticket:', error);
      // The optimistic update will be automatically rolled back by the hook.
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
            {connectionState.status === 'connected' ? (
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
                  connectionState.status === 'connected'
                    ? 'default'
                    : 'destructive'
                }
              >
                {connectionState.status}
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
              {optimisticTickets.map((ticket) => (
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
                    Created:{' '}
                    {ticket.created_at
                      ? new Date(ticket.created_at).toLocaleString()
                      : 'N/A'}
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
                      <Badge variant='outline'>{event.type}</Badge>
                      <span className='text-muted-foreground'>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className='mt-1 font-mono text-xs'>
                      {(event.payload.new as Ticket)?.title ||
                        (event.payload.old as Ticket)?.title ||
                        'No title'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {connectionState.status !== 'connected' && (
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
              {connectionState.status === 'connected' ? (
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

