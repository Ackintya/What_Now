/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3005';
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
    ];
  },
};
module.exports = nextConfig;
