import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      { source: '/ingredients', destination: '/', permanent: true },
      { source: '/scanner', destination: '/', permanent: true },
      { source: '/procedure/:slug', destination: '/fiches/:slug', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.onrender.com http://localhost:8000 https://*.supabase.co; frame-src 'none';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
