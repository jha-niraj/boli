/*
 * Next 16, built with WEBPACK (`next build --webpack`, `next dev --webpack`) on purpose: measured in an earlier
 * project, Turbopack copied small shared server modules into ~200 route chunks (59 MiB of the Worker's 64 MiB);
 * webpack with patches/next@16.4.6.patch and the server splitChunks below came to 40 MiB. Revisit when Turbopack's
 * server chunking shares modules.
 */

const securityHeaders = [
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
    // This app's session cookie prefix, inlined into the server, the middleware and @repo/auth alike (packages/auth/src/
    // cookies.ts). Two apps on localhost share cookies by host, so each needs its own; never reuse one across apps.
    env: { AUTH_COOKIE_PREFIX: 'main' },
    // A page reached by a click is reused for 60s (back is instant), a prefetched shell for 180s. Every mutation still
    // refreshes at once (query invalidation / revalidatePath).
    experimental: {
        staleTimes: { dynamic: 60, static: 180 },
    },
    // A second dev server on the same app needs its own build directory (two `next dev` sharing `.next` overwrite each
    // other's manifests): `NEXT_DIST_DIR=.next-3100 next dev --webpack --port 3100`.
    distDir: process.env.NEXT_DIST_DIR || '.next',
    // Types are checked by `check-types`, not inside `next build`.
    typescript: { ignoreBuildErrors: true },
    // Next leaves the production SERVER build at webpack's defaults, so a module shared by many routes is copied into each
    // route's file. Let shared modules become chunks (12.7 MiB of the Worker in an earlier project).
    webpack: (config, { isServer, dev, nextRuntime }) => {
        if (isServer && !dev && nextRuntime === 'nodejs' && config.optimization?.splitChunks) {
            config.optimization.splitChunks = {
                ...config.optimization.splitChunks,
                minSize: 2000,
                maxInitialRequests: Infinity,
                maxAsyncRequests: Infinity,
            };
        }
        return config;
    },
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
            { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
        ],
    },
    async headers() {
        return [{ source: '/(.*)', headers: securityHeaders }];
    },
    async rewrites() {
        // Sign-out: worker.ts answers POST /api/sign-out before Next in production; under `next dev` the auth route does.
        // The public API (OpenAI-compatible): /v1/* is served by ONE dispatcher route, app/api/v1/[...path]/route.ts. The
        // middleware skips /api/, and the route checks its own API key.
        return [
            { source: '/api/sign-out', destination: '/api/auth/app-sign-out' },
            { source: '/v1/:path*', destination: '/api/v1/:path*' },
        ];
    },
    async redirects() {
        return [
            // The chat moved from /ai to /kura (Boli, 2026-11-24).
            { source: '/ai', destination: '/kura', permanent: true },
            { source: '/ai/:id', destination: '/kura/:id', permanent: true },
            { source: '/help', destination: '/docs', permanent: false },
        ];
    },
};

export default nextConfig;
