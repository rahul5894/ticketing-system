'use client';

import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  message?: string;
  className?: string;
}

export function LoadingScreen({ 
  message = 'Signing you in...', 
  className 
}: LoadingScreenProps) {
  return (
    <div className={cn(
      'fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center',
      className
    )}>
      <div className="text-center">
        {/* Spinner */}
        <div className="relative">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-blue-400 rounded-full animate-spin mx-auto opacity-60" style={{ animationDelay: '0.15s' }}></div>
        </div>
        
        {/* Message */}
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
}

export function InlineLoadingSpinner({ 
  size = 'sm', 
  className 
}: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3'
  };

  return (
    <div className={cn(
      'border-gray-200 border-t-blue-600 rounded-full animate-spin',
      sizeClasses[size],
      className
    )}></div>
  );
}
