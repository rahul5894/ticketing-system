import SimpleRealtimeTestClient from './simple-realtime-test-client';

export default function SimpleRealtimeTestPage() {
  return (
    <div className='container mx-auto p-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold mb-2'>Simple Real-time Test</h1>
        <p className='text-muted-foreground'>
          Basic real-time functionality testing with minimal complexity
        </p>
      </div>
      <SimpleRealtimeTestClient />
    </div>
  );
}
