'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface AuthLoadingStateProps {
  isLoading?: boolean;
  message?: string;
  children: React.ReactNode;
}

export function AuthLoadingState({
  isLoading = false,
  message = 'Loading...',
  children,
}: AuthLoadingStateProps) {
  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-50'>
        <div className='flex flex-col items-center space-y-4'>
          <Loader2 className='h-8 w-8 animate-spin text-blue-600' />
          <p className='text-gray-600'>{message}</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export function InlineAuthLoading({
  isLoading = false,
  message = 'Loading...',
}: {
  isLoading?: boolean;
  message?: string;
}) {
  if (!isLoading) return null;
  return (
    <div className='flex items-center space-x-2 text-gray-600'>
      <Loader2 className='h-4 w-4 animate-spin' />
      <span className='text-sm'>{message}</span>
    </div>
  );
}

