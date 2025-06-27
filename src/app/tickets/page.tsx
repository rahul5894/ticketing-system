'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/features/shared/components/AppLayout';
import { RecentTickets } from '@/features/ticketing/components/RecentTickets';
import { TicketDetail } from '@/features/ticketing/components/TicketDetail';
import {
  CreateTicketForm,
  CreateTicketFormData,
} from '@/features/ticketing/components/CreateTicketForm';
import { VisitorInformation } from '@/features/visitor/components/VisitorInformation';
import { useTicketingStore } from '@/features/ticketing/store/use-ticketing-store';
import { TenantProvider } from '@/features/tenant/context/TenantContext';
import { getDomainFromWindow, DomainInfoState } from '@/lib/domain';
import { usePermissions } from '@/features/shared/hooks/useAuth';
import { useTicketRealtime } from '@/features/ticketing/hooks/useTicketRealtime';
import { useClerkSupabaseSync } from '@/hooks/useClerkSupabaseSync';
import {
  SyncStatusIndicator,
  SyncDebugInfo,
} from '../../features/shared/components/SyncStatusIndicator';
import { AuthErrorBoundary } from '@/features/shared/components/AuthErrorBoundary';
import { AuthLoadingState } from '@/features/shared/components/AuthLoadingState';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/features/shared/components/ui/dialog';
import { Button } from '@/features/shared/components/ui/button';

function TicketsPageContent() {
  const { user, isLoaded } = useUser();
  const {
    selectedTicketId,
    selectTicket,
    updateTicket,
    addTicket,
    getTicketsForTenant,
    setTenantId,
    useMockData,
    isLoading,
  } = useTicketingStore();
  const { hasPermission } = usePermissions();
  // const tenantIdFromContext = useTenantId(); // TODO: Use this when implementing proper tenant context
  const [domainInfo, setDomainInfo] = useState<DomainInfoState>(null);
  const [tenantId, setCurrentTenantId] = useState<string | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [showDraftConfirmation, setShowDraftConfirmation] = useState(false);
  const [pendingTicketId, setPendingTicketId] = useState<string | null>(null);

  // Set up Clerk-Supabase synchronization with modern auth state management
  const { syncStatus, syncData, triggerSync, authState, isAuthReady } =
    useClerkSupabaseSync(tenantId);

  // Set up real-time subscriptions for ticket updates
  useTicketRealtime(tenantId, !useMockData && !!user);

  useEffect(() => {
    setDomainInfo(getDomainFromWindow());
  }, []);

  useEffect(() => {
    if (domainInfo) {
      const currentTenantId = domainInfo.tenantId;
      setCurrentTenantId(currentTenantId);
      setTenantId(currentTenantId);

      // The sync hook will handle switching between mock and real data
      // based on whether sync is successful
    }
  }, [domainInfo, setTenantId]);

  // Show loading while authentication is being checked or transitioning
  if (!isLoaded || !isAuthReady || authState.isTransitioning) {
    return (
      <AuthLoadingState
        isLoading={!isLoaded}
        isTransitioning={authState.isTransitioning}
        message={
          authState.isTransitioning
            ? 'Authenticating...'
            : 'Loading your workspace...'
        }
      >
        <div />
      </AuthLoadingState>
    );
  }

  // For localhost, show welcome message if not authenticated
  if (domainInfo?.isLocalhost && !user) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='max-w-md w-full space-y-8 p-8 text-center'>
          <h1 className='text-4xl font-bold text-gray-900 mb-4'>
            Welcome to QuantumNest
          </h1>
          <p className='text-lg text-gray-600 mb-8'>
            This is a multi-tenant support ticketing system. To access tickets,
            please visit your organization&apos;s subdomain or sign in.
          </p>
          <Link
            href='/sign-in'
            className='inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors'
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // For subdomains, authentication is required (handled by middleware)
  // If we reach here, user is authenticated

  // Get tickets for current tenant
  const tickets = getTicketsForTenant(tenantId);

  const selectedTicket = tickets.find(
    (ticket) => ticket.id === selectedTicketId
  );

  // Handle create ticket
  const handleCreateTicket = () => {
    setIsCreatingTicket(true);
  };

  // Handle ticket selection with draft confirmation
  const handleTicketSelect = (ticketId: string) => {
    if (isCreatingTicket) {
      // Check if there's any form data that might be lost
      const draftData = localStorage.getItem('ticket-draft');
      if (draftData) {
        // Show confirmation dialog
        setPendingTicketId(ticketId);
        setShowDraftConfirmation(true);
      } else {
        // No draft data, proceed directly
        setIsCreatingTicket(false);
        selectTicket(ticketId);
      }
    } else {
      // Not in create mode, proceed normally
      selectTicket(ticketId);
    }
  };

  // Handle draft confirmation - Save Changes
  const handleSaveChanges = () => {
    setShowDraftConfirmation(false);
    setIsCreatingTicket(false);
    if (pendingTicketId) {
      selectTicket(pendingTicketId);
      setPendingTicketId(null);
    }
  };

  // Handle draft confirmation - Discard Changes
  const handleDiscardChanges = () => {
    // Clear the draft
    localStorage.removeItem('ticket-draft');
    setShowDraftConfirmation(false);
    setIsCreatingTicket(false);
    if (pendingTicketId) {
      selectTicket(pendingTicketId);
      setPendingTicketId(null);
    }
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setShowDraftConfirmation(false);
    setPendingTicketId(null);
  };

  const handleSubmitTicket = async (data: CreateTicketFormData) => {
    if (!user) return;

    setIsSubmittingTicket(true);

    try {
      // Convert File objects to Attachment format
      const attachments = data.attachments.map((file, index) => ({
        id: `att_${Date.now()}_${index}`,
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file), // Temporary URL for demo
        uploadedAt: new Date(),
      }));

      // Create the ticket data
      const ticketData = {
        tenantId: tenantId || 'localhost',
        title: data.title,
        description: data.description,
        status: 'open' as const,
        priority: data.priority,
        department: data.department,
        userId: user.id,
        userName: user.fullName || user.firstName || 'Unknown User',
        userEmail: user.primaryEmailAddress?.emailAddress || '',
        userAvatar: user.imageUrl,
        messages: [
          {
            id: `msg_${Date.now()}`,
            content: data.description,
            authorId: user.id,
            authorName: user.fullName || user.firstName || 'Unknown User',
            authorAvatar: user.imageUrl,
            createdAt: new Date(),
            attachments: attachments,
          },
        ],
        attachments: attachments,
      };

      // Add the ticket to the store
      const newTicketId = addTicket(ticketData);

      // Reset form state
      setIsCreatingTicket(false);
      setIsSubmittingTicket(false);

      // Select the new ticket
      selectTicket(newTicketId);
    } catch (error) {
      console.error('Failed to create ticket:', error);
      setIsSubmittingTicket(false);
    }
  };

  return (
    <AppLayout rightSidebar={<VisitorInformation />}>
      <div className='flex h-full'>
        {/* Recent Tickets Sidebar */}
        <div className='w-96 shrink-0 h-full flex flex-col'>
          {/* Sync Status Indicator */}
          <div className='p-4 border-b border-gray-200 dark:border-gray-700 hidden'>
            <SyncStatusIndicator
              syncStatus={syncStatus}
              onRetry={triggerSync}
            />
            {/* Debug info for development - hidden since sync is working properly */}
            {process.env.NODE_ENV === 'development' && false && (
              <SyncDebugInfo
                syncStatus={syncStatus}
                syncData={syncData}
                show={true}
              />
            )}
          </div>

          <div className='flex-1'>
            <RecentTickets
              selectedTicketId={selectedTicketId}
              onTicketSelect={handleTicketSelect}
              onCreateTicket={handleCreateTicket}
              tickets={tickets}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Main Content - Ticket Detail or Create Form */}
        <div className='flex-1 px-6 h-full overflow-hidden'>
          {isCreatingTicket ? (
            <CreateTicketForm
              onSubmit={handleSubmitTicket}
              onSuccess={(ticketId) => {
                setIsCreatingTicket(false);
                selectTicket(ticketId);
                // Real-time subscription will automatically update the ticket list
                // No need to manually refresh when using Supabase
              }}
              tenantId={tenantId || 'localhost'}
              isSubmitting={isSubmittingTicket}
            />
          ) : selectedTicket ? (
            <TicketDetail
              ticket={selectedTicket}
              isAdmin={hasPermission('tickets.update')}
              onTicketUpdate={updateTicket}
            />
          ) : (
            <div className='flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'>
              <p className='text-gray-500 dark:text-gray-400'>
                Select a ticket to view details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Draft Confirmation Dialog */}
      <Dialog open={showDraftConfirmation} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Your Changes?</DialogTitle>
            <DialogDescription>
              You have unsaved changes in your ticket draft. What would you like
              to do?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2'>
            <Button variant='outline' onClick={handleDiscardChanges}>
              Discard Changes
            </Button>
            <Button onClick={handleSaveChanges}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

export default function TicketsPage() {
  return (
    <AuthErrorBoundary>
      <TenantProvider>
        <TicketsPageContent />
      </TenantProvider>
    </AuthErrorBoundary>
  );
}
