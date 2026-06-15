/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Proxy /api/* → backend — no hardcoded port in the browser bundle.
  // API_URL is server-side only (not NEXT_PUBLIC_), set per environment.
  async rewrites() {
    const dest = process.env.API_URL ?? 'http://localhost:5000';
    return [
      {
        source:      '/api/:path*',
        destination: `${dest}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
