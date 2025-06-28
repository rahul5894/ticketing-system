import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/features/shared/components/ThemeProvider';
import { SessionValidator } from '@/features/shared/components/SessionValidator';
import { SupabaseProvider } from '@/features/shared/components/SupabaseProvider';
import { Toaster } from '@/features/shared/components/ui/sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'QuantumNest',
  description: 'Modern support ticketing system built with Next.js',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang='en' suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning
        >
          <ThemeProvider defaultTheme='light' storageKey='ticketing-theme'>
            <SupabaseProvider>
              <SessionValidator>{children}</SessionValidator>
              <Toaster
                position='top-right'
                expand={true}
                richColors={true}
                closeButton={true}
              />
            </SupabaseProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
