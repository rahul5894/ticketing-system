'use client';

import { AppLayout } from '@/features/shared/components/AppLayout';
import { RecentTickets } from '@/features/ticketing/components/RecentTickets';
import { TicketDetail } from '@/features/ticketing/components/TicketDetail';
import { VisitorInformation } from '@/features/visitor/components/VisitorInformation';
import { useTicketingStore } from '@/features/ticketing/store/use-ticketing-store';

export default function TicketsPage() {
  const { tickets, selectedTicketId, selectTicket, updateTicket } =
    useTicketingStore();

  // For demo purposes, assume user is admin. In production, this would come from auth context
  const isAdmin = true;

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
