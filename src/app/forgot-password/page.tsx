'use client';

import { useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isClerkAPIResponseError } from '@clerk/nextjs/errors';

export default function ForgotPasswordPage() {
  const { isLoaded, signIn } = useSignIn();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setIsLoading(true);
    setError('');

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setSuccess(true);
      // Redirect to reset password page after a short delay
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      }, 2000);
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(
          err.errors?.[0]?.message ||
            'An error occurred while sending reset email'
        );
      } else {
        setError('An error occurred while sending reset email');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12'>
        <div className='w-full max-w-md'>
          <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-8'>
            {/* Header */}
            <div className='text-center mb-8'>
              <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                Check Your Email
              </h1>
              <p className='text-gray-600'>
                We&apos;ve sent a password reset code to {email}
              </p>
            </div>

            {/* Success Message */}
            <div className='mb-6 p-4 bg-green-50 border border-green-200 rounded-lg'>
              <p className='text-green-600 text-sm text-center'>
                Password reset email sent successfully! Redirecting you to enter
                the code...
              </p>
            </div>

            {/* Footer */}
            <div className='text-center'>
              <p className='text-sm text-gray-600'>
                Didn&apos;t receive the email?{' '}
                <button
                  onClick={() => setSuccess(false)}
                  className='text-blue-600 hover:text-blue-500 font-medium'
                >
                  Try again
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12'>
      <div className='w-full max-w-md'>
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-8'>
          {/* Header */}
          <div className='text-center mb-8'>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>
              Forgot Password?
            </h1>
            <p className='text-gray-600'>
              Enter your email address and we&apos;ll send you a code to reset
              your password.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className='mb-6 p-3 bg-red-50 border border-red-200 rounded-lg'>
              <p className='text-red-600 text-sm'>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* Email Field */}
            <div>
              <label
                htmlFor='email'
                className='block text-sm font-medium text-gray-700 mb-2'
              >
                Email Address
              </label>
              <input
                id='email'
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='Enter your email address'
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 dark:text-white'
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type='submit'
              disabled={isLoading}
              className='w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isLoading ? 'Sending Reset Code...' : 'Send Reset Code'}
            </button>
          </form>

          {/* Footer */}
          <div className='mt-6 text-center'>
            <p className='text-sm text-gray-600'>
              Remember your password?{' '}
              <Link
                href='/sign-in'
                className='text-blue-600 hover:text-blue-500 font-medium'
              >
                Back to Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

