'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { getDomainFromWindow, DomainInfoState } from '@/lib/domain';

export default function Home() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [domainInfo, setDomainInfo] = useState<DomainInfoState>(null);

  useEffect(() => {
    setDomainInfo(getDomainFromWindow());
  }, []);

  useEffect(() => {
    if (!isLoaded || !domainInfo) return;

    // For localhost without subdomain, show welcome message
    if (domainInfo.isLocalhost && !domainInfo.isSubdomain) {
      // Stay on this page to show welcome message
      return;
    }

    // For subdomains, redirect based on authentication
    if (domainInfo.isSubdomain) {
      if (user) {
        // Authenticated user, redirect to tickets
        router.replace('/tickets');
      } else {
        // Unauthenticated user, redirect to sign-in
        router.replace('/sign-in');
      }
      return;
    }

    // For root domain without subdomain, redirect to sign-in
    router.replace('/sign-in');
  }, [isLoaded, user, domainInfo, router]);

  // Show loading while checking authentication and domain
  if (!isLoaded || !domainInfo) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>Loading...</p>
        </div>
      </div>
    );
  }

  // Show welcome message for localhost without subdomain
  if (domainInfo.isLocalhost && !domainInfo.isSubdomain) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='max-w-2xl w-full space-y-8 p-8'>
          <div className='text-center'>
            <h1 className='text-5xl font-bold text-gray-900 mb-6'>
              QuantumNest
            </h1>
            <p className='text-xl text-gray-600 mb-8'>
              A modern, multi-tenant support ticketing system built with
              Next.js, Clerk, and Supabase.
            </p>

            <div className='bg-white rounded-xl shadow-lg p-8 mb-8'>
              <h2 className='text-2xl font-semibold text-gray-900 mb-4'>
                Multi-Tenant Architecture
              </h2>
              <p className='text-gray-600 mb-6'>
                This system supports multiple organizations with strict data
                isolation. Each organization has its own subdomain and isolated
                data.
              </p>

              <div className='bg-blue-50 border border-blue-200 rounded-lg p-6'>
                <h3 className='text-lg font-medium text-blue-800 mb-4'>
                  Demo Organizations Available:
                </h3>
                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='bg-white rounded-lg p-4 border border-blue-200'>
                    <h4 className='font-medium text-blue-900 mb-2'>
                      Quantum Nest
                    </h4>
                    <a
                      href='http://quantumnest.localhost:3000'
                      className='text-blue-600 hover:text-blue-700 text-sm font-medium'
                    >
                      quantumnest.localhost:3000
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className='bg-gray-100 rounded-lg p-6'>
              <h3 className='text-lg font-medium text-gray-900 mb-3'>
                Features
              </h3>
              <div className='grid gap-3 md:grid-cols-2 text-left'>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                  <span className='text-gray-700'>Clerk Authentication</span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                  <span className='text-gray-700'>
                    Multi-tenant Architecture
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                  <span className='text-gray-700'>Strict Data Isolation</span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                  <span className='text-gray-700'>Modern UI/UX</span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                  <span className='text-gray-700'>Responsive Design</span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                  <span className='text-gray-700'>Real-time Updates</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // This should not be reached due to redirects above
  return null;
}
