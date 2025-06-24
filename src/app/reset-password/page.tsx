'use client';

import React, { useState, useEffect } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { InteractiveGridPattern } from '@/features/shared/components/ui/interactive-grid-pattern';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get code from URL params if available
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setCode(codeParam);
    }
  }, [searchParams]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });

      await setActive({ session: result.createdSessionId });
      router.push('/tickets');
    } catch (err: unknown) {
      console.error(JSON.stringify(err, null, 2));
      const error = err as { errors?: { message: string }[] };
      setError(
        error.errors?.[0]?.message ||
          'An error occurred while resetting the password.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden'>
      {/* Interactive Grid Pattern Background */}
      <InteractiveGridPattern />
      <div className='max-w-md w-full relative z-10'>
        <div className='bg-white rounded-2xl shadow-xl p-8 border border-gray-100'>
          {/* Header */}
          <div className='text-center mb-8'>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>
              Reset Password
            </h1>
            <p className='text-gray-600'>
              Enter the 6-digit code from your email and create a new password
              for your QuantumNest account.
            </p>
          </div>

          <form onSubmit={handleReset} className='space-y-6'>
            <div>
              <label
                htmlFor='code'
                className='text-sm font-medium text-gray-700 mb-2 block'
              >
                6-Digit Code
              </label>
              <input
                id='code'
                type='text'
                placeholder='Enter 6-digit code'
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                maxLength={6}
                className='w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400 text-gray-900'
              />
            </div>

            <div>
              <label
                htmlFor='password'
                className='text-sm font-medium text-gray-700 mb-2 block'
              >
                New Password
              </label>
              <input
                id='password'
                type='password'
                placeholder='Enter your new password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className='w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400'
              />
            </div>

            <div>
              <label
                htmlFor='confirmPassword'
                className='text-sm font-medium text-gray-700 mb-2 block'
              >
                Confirm New Password
              </label>
              <input
                id='confirmPassword'
                type='password'
                placeholder='Confirm your new password'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className='w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400'
              />
            </div>

            <button
              type='submit'
              disabled={isLoading}
              className='w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors'
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          {error && (
            <div className='mt-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
              <p className='text-red-600 text-sm'>{error}</p>
            </div>
          )}

          {/* Footer */}
          <div className='mt-6 text-center'>
            <p className='text-gray-600'>
              Remember your password?{' '}
              <Link
                href='/sign-in'
                className='text-blue-600 hover:text-blue-700 font-medium'
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

