/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    domains: ['localhost', '127.0.0.1'],
  },
  experimental: {
    allowedDevOrigins: ['localhost', '127.0.0.1'],
  },
}

export default nextConfig
