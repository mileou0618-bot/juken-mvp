/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.output.chunkFilename = "chunks/[id].js";
    }
    return config;
  },
};

module.exports = nextConfig;
