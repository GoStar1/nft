/** @type {import('next').NextConfig} */

const nextConfig = {
    reactStrictMode: true,
    webpackDevMiddleware: (config) => {
        config.watchOptions = {
            poll: 1000,
            aggregateTimeout: 300,
        };
        return config;
    },
    images: {
        domains: [
            'gateway.pinata.cloud',
            'aquamarine-urgent-minnow-954.mypinata.cloud',
            'cyan-implicit-salamander-90.mypinata.cloud',
            '*.mypinata.cloud',
            'ipfs.io',
            'polyplace.infura-ipfs.io', // Keep for backward compatibility
        ],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.mypinata.cloud',
                pathname: '/ipfs/**',
            },
            {
                protocol: 'https',
                hostname: 'gateway.pinata.cloud',
                pathname: '/ipfs/**',
            },
        ],
    },
};

module.exports = nextConfig;
