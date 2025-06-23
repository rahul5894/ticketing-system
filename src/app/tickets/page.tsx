'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/features/shared/components/AppLayout';
import { RecentTickets } from '@/features/ticketing/components/RecentTickets';
import { TicketDetail } from '@/features/ticketing/components/TicketDetail';
import { VisitorInformation } from '@/features/visitor/components/VisitorInformation';
import { useTicketingStore } from '@/features/ticketing/store/use-ticketing-store';
import { TenantProvider } from '@/features/tenant/context/TenantContext';
import { getDomainFromWindow, DomainInfoState } from '@/lib/domain';

function TicketsPageContent() {
  const { user, isLoaded } = useUser();
  const {
    selectedTicketId,
    selectTicket,
    updateTicket,
    getTicketsForTenant,
    setTenantId,
  } = useTicketingStore();
  const [domainInfo, setDomainInfo] = useState<DomainInfoState>(null);
  const [tenantId, setCurrentTenantId] = useState<string | null>(null);

  useEffect(() => {
    setDomainInfo(getDomainFromWindow());
  }, []);

  useEffect(() => {
    if (domainInfo) {
      const currentTenantId = domainInfo.tenantId;
      setCurrentTenantId(currentTenantId);
      setTenantId(currentTenantId);
    }
  }, [domainInfo, setTenantId]);

  // Show loading while authentication is being checked
  if (!isLoaded) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>Loading...</p>
        </div>
      </div>
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

  // Determine if user is admin (simplified logic for demo)
  const isAdmin = user?.publicMetadata?.role === 'admin' || true; // Default to true for demo

  // Get tickets for current tenant
  const tickets = getTicketsForTenant(tenantId);

  const selectedTicket = tickets.find(
    (ticket) => ticket.id === selectedTicketId
  );

  return (
    <AppLayout rightSidebar={<VisitorInformation />}>
      <div className='flex h-full'>
        {/* Recent Tickets Sidebar */}
        <div className='w-96 shrink-0 h-full'>
          <RecentTickets
            selectedTicketId={selectedTicketId}
            onTicketSelect={selectTicket}
            tickets={tickets}
          />
        </div>

        {/* Main Content - Ticket Detail */}
        <div className='flex-1 px-6 h-full overflow-hidden'>
          {selectedTicket ? (
            <TicketDetail
              ticket={selectedTicket}
              isAdmin={isAdmin}
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
    </AppLayout>
  );
}

export default function TicketsPage() {
  return (
    <TenantProvider>
      <TicketsPageContent />
    </TenantProvider>
  );
}
