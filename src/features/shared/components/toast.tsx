'use client';

import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  description?: string;
  duration?: number;
}

const customStyles = {
  success: {
    background: 'hsl(142.1 76.2% 36.3%)', // Custom success green
    color: 'hsl(355.7 100% 97.3%)', // White text
    border: '1px solid hsl(142.1 76.2% 36.3%)',
  },
  error: {
    background: 'hsl(0 84.2% 60.2%)', // Custom error red
    color: 'hsl(355.7 100% 97.3%)', // White text
    border: '1px solid hsl(0 84.2% 60.2%)',
  },
  info: {
    background: 'hsl(221.2 83.2% 53.3%)', // Custom info blue
    color: 'hsl(355.7 100% 97.3%)', // White text
    border: '1px solid hsl(221.2 83.2% 53.3%)',
  },
  loading: {
    background: 'hsl(47.9 95.8% 53.1%)', // Custom loading yellow
    color: 'hsl(222.2 84% 4.9%)', // Dark text
    border: '1px solid hsl(47.9 95.8% 53.1%)',
  },
};

export const toast = {
  success: (title: string, options?: ToastOptions) =>
    sonnerToast.success(title, {
      duration: 4000,
      style: customStyles.success,
      ...options,
    }),

  error: (title: string, options?: ToastOptions) =>
    sonnerToast.error(title, {
      duration: 4000,
      style: customStyles.error,
      ...options,
    }),

  loading: (title: string, options?: ToastOptions) =>
    sonnerToast.loading(title, {
      duration: 10000,
      style: customStyles.loading,
      ...options,
    }),

  info: (title: string, options?: ToastOptions) =>
    sonnerToast(title, {
      duration: 4000,
      style: customStyles.info,
      ...options,
    }),

  dismiss: sonnerToast.dismiss,
};

