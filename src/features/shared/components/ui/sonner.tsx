'use client';

import { useTheme } from '../ThemeProvider';
import { Toaster as Sonner, ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  // Ensure theme is never undefined for exactOptionalPropertyTypes compatibility
  const resolvedTheme: 'light' | 'dark' | 'system' =
    theme === 'light' || theme === 'dark' || theme === 'system'
      ? theme
      : 'system';

  return <Sonner theme={resolvedTheme} className='toaster group' {...props} />;
};

export { Toaster };

