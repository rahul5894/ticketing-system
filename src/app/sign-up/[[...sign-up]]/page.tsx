'use client';

import { useSignUp } from '@clerk/nextjs';
import { getDomainFromWindow, DomainInfoState } from '@/lib/domain';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { InteractiveGridPattern } from '@/features/shared/components/ui/interactive-grid-pattern';

export default function SignUpPage() {
  const [domainInfo, setDomainInfo] = useState<DomainInfoState>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();

  useEffect(() => {
    setDomainInfo(getDomainFromWindow());
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    setIsLoading(true);
    setError('');

    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setVerificationStep(true);
    } catch (err: unknown) {
      const error = err as { errors?: { message: string }[] };
      setError(
        error.errors?.[0]?.message || 'An error occurred during sign up.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push('/tickets');
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (err: unknown) {
      const error = err as { errors?: { message: string }[] };
      setError(error.errors?.[0]?.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignUp = async (
    provider: 'oauth_google' | 'oauth_apple'
  ) => {
    if (!isLoaded || !signUp) return;

    try {
      await signUp.authenticateWithRedirect({
        strategy: provider,
        redirectUrl: '/tickets',
        redirectUrlComplete: '/tickets',
      });
    } catch (err: unknown) {
      const error = err as { errors?: { message: string }[] };
      setError(error.errors?.[0]?.message || 'Social sign up failed.');
    }
  };

  // Show message for localhost without subdomain
  if (domainInfo?.isLocalhost && !domainInfo?.isSubdomain) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='max-w-md w-full space-y-8 p-8'>
          <div className='text-center'>
            <h1 className='text-4xl font-bold text-gray-900 mb-4'>
              Sign Up Not Available
            </h1>
            <p className='text-lg text-gray-600 mb-8'>
              Sign up is only available through your organization&apos;s
              subdomain. Please contact your administrator or visit your
              organization&apos;s specific URL.
            </p>
            <Link
              href='/sign-in'
              className='inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors'
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show sign-up form for subdomains
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden'>
      {/* Interactive Grid Pattern Background */}
      <InteractiveGridPattern />
      <div className='max-w-md w-full relative z-10'>
        <div className='bg-white rounded-2xl shadow-xl p-8 border border-gray-100'>
          <style jsx global>{`
            .cl-socialButtonsBlockButton[data-provider='google']
              .cl-socialButtonsBlockButtonText::before {
              content: '';
              display: inline-block;
              width: 20px;
              height: 20px;
              margin-right: 8px;
              background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%234285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'/%3E%3Cpath fill='%2334A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'/%3E%3Cpath fill='%23FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'/%3E%3Cpath fill='%23EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'/%3E%3C/svg%3E");
              background-size: contain;
              background-repeat: no-repeat;
              vertical-align: middle;
            }
            .cl-socialButtonsBlockButton[data-provider='apple']
              .cl-socialButtonsBlockButtonText::before {
              content: '';
              display: inline-block;
              width: 20px;
              height: 20px;
              margin-right: 8px;
              background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z'/%3E%3C/svg%3E");
              background-size: contain;
              background-repeat: no-repeat;
              vertical-align: middle;
            }
          `}</style>
          {/* Header */}
          <div className='text-center mb-8'>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>
              Create Account
            </h1>
            <p className='text-gray-600'>
              Join QuantumNest and start managing tickets.
            </p>
          </div>

          {/* Custom Sign Up Form */}
          {!verificationStep ? (
            <form onSubmit={handleSignUp} className='space-y-6'>
              {/* Name Fields */}
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label
                    htmlFor='firstName'
                    className='block text-sm font-medium text-gray-700 mb-2'
                  >
                    First Name
                  </label>
                  <input
                    id='firstName'
                    type='text'
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder='John'
                    required
                    className='w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400 text-gray-900'
                  />
                </div>
                <div>
                  <label
                    htmlFor='lastName'
                    className='block text-sm font-medium text-gray-700 mb-2'
                  >
                    Last Name
                  </label>
                  <input
                    id='lastName'
                    type='text'
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder='Doe'
                    required
                    className='w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400 text-gray-900'
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label
                  htmlFor='email'
                  className='block text-sm font-medium text-gray-700 mb-2'
                >
                  Email
                </label>
                <input
                  id='email'
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='john.doe@company.com'
                  required
                  className='w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400 text-gray-900'
                />
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor='password'
                  className='block text-sm font-medium text-gray-700 mb-2'
                >
                  Password
                </label>
                <div className='relative'>
                  <input
                    id='password'
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder='Create a strong password'
                    required
                    className='w-full h-12 px-4 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400 text-gray-900'
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700'
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className='p-3 bg-red-50 border border-red-200 rounded-lg'>
                  <p className='text-red-600 text-sm'>{error}</p>
                </div>
              )}

              {/* Sign Up Button */}
              <button
                type='submit'
                disabled={isLoading}
                className='w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors text-base'
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerification} className='space-y-6'>
              <div className='text-center mb-6'>
                <p className='text-gray-600'>
                  We&apos;ve sent a verification code to{' '}
                  <strong>{email}</strong>. Please enter it below.
                </p>
              </div>

              <div>
                <label
                  htmlFor='verificationCode'
                  className='block text-sm font-medium text-gray-700 mb-2'
                >
                  Verification Code
                </label>
                <input
                  id='verificationCode'
                  type='text'
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder='Enter 6-digit code'
                  required
                  maxLength={6}
                  className='w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400 text-gray-900'
                />
              </div>

              {error && (
                <div className='p-3 bg-red-50 border border-red-200 rounded-lg'>
                  <p className='text-red-600 text-sm'>{error}</p>
                </div>
              )}

              <button
                type='submit'
                disabled={isLoading}
                className='w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors text-base'
              >
                {isLoading ? 'Verifying...' : 'Verify Email'}
              </button>

              <button
                type='button'
                onClick={() => setVerificationStep(false)}
                className='w-full text-sm text-blue-600 hover:text-blue-700 font-medium'
              >
                Back to Sign Up
              </button>
            </form>
          )}

          {/* Or Sign Up With Divider - Only show on initial form */}
          {!verificationStep && (
            <>
              <div className='mt-6 mb-6'>
                <div className='relative'>
                  <div className='absolute inset-0 flex items-center'>
                    <div className='w-full border-t border-gray-300'></div>
                  </div>
                  <div className='relative flex justify-center text-sm'>
                    <span className='px-2 bg-white text-gray-500 font-medium'>
                      Or Sign Up With
                    </span>
                  </div>
                </div>
              </div>

              {/* Social Sign Up Buttons */}
              <div className='grid grid-cols-2 gap-3 mb-6'>
                <button
                  type='button'
                  onClick={() => handleSocialSignUp('oauth_google')}
                  className='flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer'
                >
                  <svg className='w-5 h-5 mr-2' viewBox='0 0 24 24'>
                    <path
                      fill='#4285F4'
                      d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                    />
                    <path
                      fill='#34A853'
                      d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                    />
                    <path
                      fill='#FBBC05'
                      d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                    />
                    <path
                      fill='#EA4335'
                      d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                    />
                  </svg>
                  Google
                </button>
                <button
                  type='button'
                  onClick={() => handleSocialSignUp('oauth_apple')}
                  className='flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer'
                >
                  <svg
                    className='w-5 h-5 mr-2'
                    viewBox='0 0 24 24'
                    fill='currentColor'
                  >
                    <path d='M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z' />
                  </svg>
                  Apple
                </button>
              </div>
            </>
          )}

          {/* Footer */}
          <div className='mt-6 text-center'>
            <p className='text-gray-600'>
              Already Have An Account?{' '}
              <Link
                href='/sign-in'
                className='text-blue-600 hover:text-blue-700 font-medium'
              >
                Sign In.
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

