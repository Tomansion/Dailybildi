/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },
  experimental: {
    serverComponentsExternalPackages: ['node-cron', 'arangojs', 'bcryptjs'],
    // Disable instrumentationHook during build to reduce RAM usage
    instrumentationHook: process.env.NODE_ENV === 'production',
  },
  swcMinify: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    
    // Optimize webpack config to reduce memory during build
    config.optimization = {
      ...config.optimization,
      nodeEnv: false,
      minimize: true,
    };
    
    return config;
  },
}

module.exports = nextConfig
