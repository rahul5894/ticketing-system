import { useCallback, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';

// Types
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type Department = 'sales' | 'support' | 'marketing' | 'technical';

interface CreateTicketFormData {
  title: string;
  description: string;
  priority: TicketPriority;
  department: Department;
  assignedTo: string[];
  cc?: string | undefined;
  attachments: File[];
}

interface TicketDraft {
  title: string;
  description: string;
  priority: TicketPriority;
  department: Department;
  assignedTo: string[];
  cc?: string | undefined;
  // Note: attachments are not persisted to localStorage
}

const DRAFT_STORAGE_KEY = 'ticket-draft';

/**
 * Custom hook for managing ticket draft persistence
 * Automatically saves form data to localStorage and provides methods to load/clear drafts
 */
export function useDraftPersistence(form: UseFormReturn<CreateTicketFormData>) {
  // Save draft to localStorage (with error handling)
  const saveDraft = useCallback((data: TicketDraft) => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save ticket draft:', error);
    }
  }, []);

  // Load draft from localStorage (with error handling)
  const loadDraft = useCallback((): TicketDraft | null => {
    try {
      const draftData = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (draftData) {
        return JSON.parse(draftData);
      }
    } catch (error) {
      console.warn('Failed to load ticket draft:', error);
    }
    return null;
  }, []);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear ticket draft:', error);
    }
  }, []);

  // Load draft on component mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      // Reset form with draft data, preserving attachments as empty array
      form.reset({
        ...draft,
        attachments: [], // Don't persist file objects
      });
    }
  }, [form, loadDraft]);

  // Watch form changes and save draft (debounced)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const subscription = form.watch((data) => {
      // Clear previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Only save if form has meaningful data
      if (data.title || data.description || data.cc) {
        const draftData: TicketDraft = {
          title: data.title || '',
          description: data.description || '',
          priority: data.priority || 'high',
          department: data.department || 'marketing',
          assignedTo: (data.assignedTo || []).filter(
            (item): item is string => typeof item === 'string'
          ),
          cc: data.cc,
          // Don't include attachments in draft
        };

        // Debounce the save operation
        timeoutId = setTimeout(() => {
          saveDraft(draftData);
        }, 500);
      }
    });

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.unsubscribe();
    };
  }, [form, saveDraft]);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
  };
}

