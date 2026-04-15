import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactCompiler: true,

    // Optimize images
    images: {
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 60,
    },

    // HTTP headers — cache static API data at CDN edge
    async headers() {
        return [
            {
                source: '/api/admin/lottery-types',
                headers: [
                    { key: 'Cache-Control', value: 's-maxage=60, stale-while-revalidate=300' },
                ],
            },
        ];
    },

    // Compress responses
    compress: true,
};

export default nextConfig;
