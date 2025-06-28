'use client';

import { toast as sonnerToast } from 'sonner';

// Base styles for all toasts - minimal to avoid interfering with Sonner positioning
const baseToastStyle: React.CSSProperties = {};

/**
 * Extended toast options for structured notifications
 */
interface StructuredToastOptions {
  id?: string | number;
  description?: string | undefined;
  duration?: number;
  style?: React.CSSProperties;
}

/**
 * Custom toast functions with consistent styling
 */
export const toast = {
  /**
   * Show a success toast notification
   * @param title - The main message or title
   * @param options - Additional options including description for structured notifications
   */
  success: (title: string, options?: StructuredToastOptions) => {
    return sonnerToast.success(title, {
      duration: 4000,
      className: 'custom-toast custom-toast-success',
      style: {
        ...baseToastStyle,
      },
      closeButton: false,
      ...options,
    });
  },

  /**
   * Show an error toast notification
   * @param title - The main message or title
   * @param options - Additional options including description for structured notifications
   */
  error: (title: string, options?: StructuredToastOptions) => {
    return sonnerToast.error(title, {
      duration: 4000,
      className: 'custom-toast custom-toast-error',
      style: {
        ...baseToastStyle,
      },
      closeButton: false,
      ...options,
    });
  },

  /**
   * Show a loading toast notification
   * @param title - The main message or title
   * @param options - Additional options including description for structured notifications
   */
  loading: (title: string, options?: StructuredToastOptions) => {
    return sonnerToast.loading(title, {
      duration: 10000,
      className: 'custom-toast custom-toast-loading',
      style: {
        ...baseToastStyle,
      },
      closeButton: false,
      ...options,
    });
  },

  /**
   * Show an info toast notification
   * @param title - The main message or title
   * @param options - Additional options including description for structured notifications
   */
  info: (title: string, options?: StructuredToastOptions) => {
    return sonnerToast(title, {
      duration: 4000,
      className: 'custom-toast custom-toast-info',
      style: {
        ...baseToastStyle,
      },
      closeButton: false,
      ...options,
    });
  },

  /**
   * Dismiss a toast by its ID
   */
  dismiss: sonnerToast.dismiss,
};

