'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { getDomainFromWindow, DomainInfo } from '@/lib/domain';
import { Alert, AlertDescription } from './ui/alert';
import { XCircle, AlertTriangle } from 'lucide-react';

interface SessionValidatorProps {
  children: React.ReactNode;
}

export function SessionValidator({ children }: SessionValidatorProps) {
  const { user, isLoaded } = useUser();
  const [domainInfo, setDomainInfo] = useState<DomainInfo | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setDomainInfo(getDomainFromWindow());
  }, []);

  useEffect(() => {
    if (!isLoaded || !domainInfo) return;

    if (domainInfo.isLocalhost) {
      setValidationError(null);
      return;
    }

    if (domainInfo.isSubdomain && !user) {
      setValidationError('Authentication required');
      return;
    }

    setValidationError(null);
  }, [isLoaded, user, domainInfo]);

  // Show loading state
  if (!isLoaded || !domainInfo) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>Validating session...</p>
        </div>
      </div>
    );
  }

  // Show validation error
  if (validationError) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='max-w-md w-full p-8'>
          <Alert variant='destructive' className='mb-6'>
            <XCircle className='h-4 w-4' />
            <AlertDescription className='font-medium'>
              Session Validation Failed
            </AlertDescription>
          </Alert>

          <div className='bg-white rounded-lg shadow-lg p-6'>
            <div className='text-center'>
              <AlertTriangle className='w-12 h-12 text-red-500 mx-auto mb-4' />
              <h2 className='text-xl font-semibold text-gray-900 mb-2'>
                Access Denied
              </h2>
              <p className='text-gray-600 mb-6'>{validationError}</p>

              <div className='space-y-3'>
                <button
                  onClick={() => (window.location.href = '/sign-in')}
                  className='w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors'
                >
                  Sign In
                </button>

                {domainInfo?.isSubdomain && (
                  <button
                    onClick={() =>
                      (window.location.href = 'http://localhost:3000')
                    }
                    className='w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors'
                  >
                    Go to Main Site
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Session is valid, render children
  return <>{children}</>;
}

export function useSessionValidation() {
  const { user, isLoaded } = useUser();
  const [domainInfo, setDomainInfo] = useState<DomainInfo | null>(null);

  useEffect(() => {
    setDomainInfo(getDomainFromWindow());
  }, []);

  const isValidating = !isLoaded || !domainInfo;
  const hasValidationError = domainInfo?.isSubdomain && !user;
  const isValid = !isValidating && !hasValidationError;

  return { isValidating, isValid, hasValidationError, user, domainInfo };
}
