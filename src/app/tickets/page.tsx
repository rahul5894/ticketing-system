'use client';

import { useState } from 'react';
import { AppLayout } from '@/domains/shared/components/AppLayout';
import { RecentTickets } from '@/domains/ticketing/components/RecentTickets';
import { TicketDetail } from '@/domains/ticketing/components/TicketDetail';
import { VisitorInformation } from '@/domains/visitor/components/VisitorInformation';
import { mockTickets, Ticket } from '@/domains/ticketing/models/ticket.schema';

export default function TicketsPage() {
  const [selectedTicketId, setSelectedTicketId] = useState<string>('1');
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);

  const selectedTicket = tickets.find(
    (ticket) => ticket.id === selectedTicketId
  );

  const handleTicketUpdate = (ticketId: string, updates: Partial<Ticket>) => {
    setTickets((prevTickets) =>
      prevTickets.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, ...updates, updatedAt: new Date() }
          : ticket
      )
    );
  };

  return (
    <AppLayout rightSidebar={<VisitorInformation />}>
      <div className='flex h-full'>
        {/* Recent Tickets Sidebar */}
        <div className='w-96 shrink-0 h-full'>
          <RecentTickets
            selectedTicketId={selectedTicketId}
            onTicketSelect={setSelectedTicketId}
            tickets={tickets}
          />
        </div>

        {/* Main Content - Ticket Detail */}
        <div className='flex-1 px-6 h-full overflow-hidden'>
          {selectedTicket ? (
            <TicketDetail
              ticket={selectedTicket}
              onTicketUpdate={handleTicketUpdate}
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
