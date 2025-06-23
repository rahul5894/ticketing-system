import Link from 'next/link';

export default function NotFound() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <div className='max-w-md w-full text-center space-y-8 p-8'>
        <div className='space-y-4'>
          <h1 className='text-6xl font-bold text-gray-900'>404</h1>
          <h2 className='text-2xl font-semibold text-gray-700'>
            Organization Not Found
          </h2>
          <p className='text-gray-600'>
            The subdomain you&apos;re trying to access doesn&apos;t exist or
            isn&apos;t available.
          </p>
        </div>

        <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
          <h3 className='text-sm font-medium text-blue-800 mb-2'>
            Available Organization:
          </h3>
          <p className='text-sm text-blue-700'>• quantumnest.localhost:3000</p>
        </div>

        <div className='space-y-4'>
          <Link
            href='http://localhost:3000'
            className='inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors'
          >
            Go to Main Site
          </Link>

          <Link
            href='http://quantumnest.localhost:3000'
            className='inline-block w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors'
          >
            Visit QuantumNest
          </Link>
        </div>
      </div>
    </div>
  );
}

