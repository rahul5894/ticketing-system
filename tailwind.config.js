/** @type {import('tailwindcss').Config} */

const config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      /* ---------- COLORS ---------- */
      colors: {
        background: {
          DEFAULT: '#ffffff',
          dark: '#121212',
        },
        foreground: {
          DEFAULT: '#1f2937',
          dark: '#e5e7eb',
        },
      },

      /* ---------- FONTS ---------- */
      fontFamily: {
        // Geist variables are injected by next/font in app/layout.tsx
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },

      /* ---------- BREAKPOINTS ---------- */
      screens: {
        lg: '1024px',
      },

      /* ---------- ANIMATION ---------- */
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        shimmer: 'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },

      /* ---------- GRADIENTS ---------- */
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};

export default config;
