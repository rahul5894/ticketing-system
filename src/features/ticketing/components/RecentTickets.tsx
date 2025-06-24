'use client';

import { useState } from 'react';
import { Input } from '@/features/shared/components/ui/input';
import { Button } from '@/features/shared/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/features/shared/components/ui/collapsible';
import { Search, Filter, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { TicketCard } from './TicketCard';
import { mockTickets, Ticket } from '../models/ticket.schema';

interface RecentTicketsProps {
  selectedTicketId?: string | null;
  onTicketSelect?: (ticketId: string) => void;
  onCreateTicket?: () => void;
  tickets?: Ticket[];
}

type AccordionSection = 'new' | 'open' | 'closed';

export function RecentTickets({
  selectedTicketId,
  onTicketSelect,
  onCreateTicket,
  tickets = mockTickets,
}: RecentTicketsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openSection, setOpenSection] = useState<AccordionSection>('open');

  // Helper function to check if ticket is new (created within last 24 hours)
  const isNewTicket = (ticket: Ticket) => {
    // Use a fixed reference date to avoid hydration mismatches
    const referenceDate = new Date('2024-06-23T08:00:00Z');
    const twentyFourHoursAgo = new Date(
      referenceDate.getTime() - 24 * 60 * 60 * 1000
    );
    return ticket.createdAt > twentyFourHoursAgo;
  };

  // Filter tickets by category
  const newTickets = tickets.filter((ticket) => isNewTicket(ticket));
  const openTickets = tickets.filter((ticket) => ticket.status === 'open');
  const closedTickets = tickets.filter(
    (ticket) => ticket.status === 'closed' || ticket.status === 'resolved'
  );

  // Apply search filter to the appropriate category
  const getFilteredTickets = (categoryTickets: Ticket[]) => {
    return categoryTickets.filter(
      (ticket) =>
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.userName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredNewTickets = getFilteredTickets(newTickets);
  const filteredOpenTickets = getFilteredTickets(openTickets);
  const filteredClosedTickets = getFilteredTickets(closedTickets);

  // Handle accordion section toggle
  const handleSectionToggle = (section: AccordionSection) => {
    setOpenSection(openSection === section ? 'open' : section);
  };

  // Section colors for dots
  const sectionColors = {
    new: 'bg-blue-500', // Blue for new tickets
    open: 'bg-green-500', // Green for open tickets
    closed: 'bg-gray-500', // Gray for closed tickets
  };

  // Helper component for accordion sections
  const AccordionSection = ({
    section,
    title,
    tickets,
    isOpen,
  }: {
    section: AccordionSection;
    title: string;
    tickets: Ticket[];
    isOpen: boolean;
  }) => (
    <Collapsible
      open={isOpen}
      onOpenChange={() => handleSectionToggle(section)}
      className='data-[state=open]:flex-1 flex flex-col min-h-0 border-b border-gray-200 dark:border-gray-700 last:border-b-0'
    >
      <CollapsibleTrigger asChild>
        <Button
          variant='ghost'
          className='w-full justify-between px-6 py-4 h-auto font-normal shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-none cursor-pointer bg-gray-50 dark:bg-gray-900 data-[state=open]:border-b data-[state=open]:border-gray-200 dark:data-[state=open]:border-gray-700'
        >
          <div className='flex items-center gap-2'>
            <div className={`w-2 h-2 rounded-full ${sectionColors[section]}`} />
            <span className='text-sm text-gray-600 dark:text-gray-400'>
              {title} ({tickets.length})
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className='h-4 w-4 text-gray-400' />
          ) : (
            <ChevronDown className='h-4 w-4 text-gray-400' />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className='flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-corner-transparent [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-none dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-button]:hidden'>
        <div className='space-y-0'>
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              isSelected={selectedTicketId === ticket.id}
              onClick={() => onTicketSelect?.(ticket.id)}
              hideStatus={true}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <div className='w-full max-w-md bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full flex flex-col shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50'>
      {/* Header */}
      <div className='p-6 border-b border-gray-200 dark:border-gray-700 shrink-0'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Recent Tickets
          </h2>
          <Button
            onClick={onCreateTicket}
            size='sm'
            className='bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700'
          >
            <Plus className='h-4 w-4 mr-2' />
            Create New Ticket
          </Button>
        </div>

        {/* Search and Filter */}
        <div className='flex gap-2 items-center'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
            <Input
              placeholder='Search'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-10 h-10'
            />
          </div>
          <Button variant='outline' className='px-3 h-10'>
            <Filter className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Accordion Tickets Sections */}
      <div className='flex-1 flex flex-col min-h-0'>
        <AccordionSection
          section='new'
          title='New Tickets'
          tickets={filteredNewTickets}
          isOpen={openSection === 'new'}
        />

        <AccordionSection
          section='open'
          title='My Open tickets'
          tickets={filteredOpenTickets}
          isOpen={openSection === 'open'}
        />

        <AccordionSection
          section='closed'
          title='Closed Tickets'
          tickets={filteredClosedTickets}
          isOpen={openSection === 'closed'}
        />
      </div>
    </div>
  );
}
