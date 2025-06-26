/**
 * Database Types for Supabase
 * 
 * This file contains TypeScript definitions for the database schema.
 * For a complete type generation, run: supabase gen types typescript --local
 */

export interface Database {
  public: {
    Tables: {
      tickets: {
        Row: {
          id: string;
          title: string;
          description: string;
          status: string;
          priority: string;
          department: string;
          userId: string;
          userName: string;
          userEmail: string;
          tenant_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          status?: string;
          priority: string;
          department: string;
          userId: string;
          userName: string;
          userEmail: string;
          tenant_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          status?: string;
          priority?: string;
          department?: string;
          userId?: string;
          userName?: string;
          userEmail?: string;
          tenant_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      realtime_test: {
        Row: {
          id: string;
          tenant_id: string;
          message: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          message: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          message?: string;
          created_by?: string;
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
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
