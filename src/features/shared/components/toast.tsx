'use client';

import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  description?: string;
  duration?: number;
}

export const toast = {
  success: (title: string, options?: ToastOptions) =>
    sonnerToast.success(title, { duration: 4000, ...options }),

  error: (title: string, options?: ToastOptions) =>
    sonnerToast.error(title, { duration: 4000, ...options }),

  loading: (title: string, options?: ToastOptions) =>
    sonnerToast.loading(title, { duration: 10000, ...options }),

  info: (title: string, options?: ToastOptions) =>
    sonnerToast(title, { duration: 4000, ...options }),

  dismiss: sonnerToast.dismiss,
};

