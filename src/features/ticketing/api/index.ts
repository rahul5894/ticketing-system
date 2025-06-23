import { supabase } from '@/lib/supabase';
import { Ticket } from '@/features/ticketing/models/ticket.schema';

export const getTickets = async (): Promise<Ticket[]> => {
  const { data, error } = await supabase.from('tickets').select('*');
  if (error) {
    console.error('Error fetching tickets:', error);
    return [];
  }
  return data as Ticket[];
};

export const updateTicket = async (
  ticketId: string,
  updates: Partial<Ticket>
): Promise<Ticket | null> => {
  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', ticketId)
    .select();
  if (error) {
    console.error('Error updating ticket:', error);
    return null;
  }
  return data?.[0] as Ticket;
};
