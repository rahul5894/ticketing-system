/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'images.clerk.dev' },
    ],
  },

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'zustand',
      'zod',
    ],
  },
};

export default nextConfig;
