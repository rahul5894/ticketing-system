import { useCallback, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { CreateTicketFormData } from '../components/CreateTicketForm';

interface TicketDraft {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  department: 'sales' | 'support' | 'marketing' | 'technical';
  assignedTo?: string; // Single agent assignment
  cc: string[]; // Multiple users for CC
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

  // Load draft manually (opt-in, not automatic)
  const loadDraftIntoForm = useCallback(() => {
    const draft = loadDraft();
    if (draft) {
      // Reset form with draft data, preserving attachments as empty array
      form.reset({
        ...draft,
        attachments: [], // Don't persist file objects
      });
      return true; // Indicates draft was loaded
    }
    return false; // No draft found
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
          assignedTo: data.assignedTo || undefined, // Single string, no filtering needed
          cc: (data.cc || []).filter(
            (id): id is string => typeof id === 'string'
          ),
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
    loadDraftIntoForm,
    clearDraft,
  };
}
