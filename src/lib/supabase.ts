import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          clerk_id: string;
          email: string;
          name: string;
          avatar_url?: string;
          role: 'user' | 'admin' | 'support';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_id: string;
          email: string;
          name: string;
          avatar_url?: string;
          role?: 'user' | 'admin' | 'support';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clerk_id?: string;
          email?: string;
          name?: string;
          avatar_url?: string;
          role?: 'user' | 'admin' | 'support';
          created_at?: string;
          updated_at?: string;
        };
      };
      tickets: {
        Row: {
          id: string;
          title: string;
          description: string;
          status: 'open' | 'closed' | 'pending' | 'resolved';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          department: 'sales' | 'support' | 'marketing' | 'technical';
          user_id: string;
          assigned_to?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          status?: 'open' | 'closed' | 'pending' | 'resolved';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          department?: 'sales' | 'support' | 'marketing' | 'technical';
          user_id: string;
          assigned_to?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          status?: 'open' | 'closed' | 'pending' | 'resolved';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          department?: 'sales' | 'support' | 'marketing' | 'technical';
          user_id?: string;
          assigned_to?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      ticket_messages: {
        Row: {
          id: string;
          ticket_id: string;
          content: string;
          author_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          content: string;
          author_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          content?: string;
          author_id?: string;
          created_at?: string;
        };
      };
      attachments: {
        Row: {
          id: string;
          ticket_id?: string;
          message_id?: string;
          name: string;
          type: string;
          size: number;
          url: string;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id?: string;
          message_id?: string;
          name: string;
          type: string;
          size: number;
          url: string;
          uploaded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          message_id?: string;
          name?: string;
          type?: string;
          size?: number;
          url?: string;
          uploaded_by?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Typed client
export const typedSupabase = supabase as ReturnType<
  typeof createClient<Database>
>;

