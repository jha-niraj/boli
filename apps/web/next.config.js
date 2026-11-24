/*
 * apps/web, the public site (bolihq.com). Next 16 built with WEBPACK (`next build --webpack`, `next dev --webpack`) like
 * apps/main: Turbopack copies shared server modules into every route chunk, and the Worker has a 64 MiB ceiling.
 * patches/next@16.4.6.patch applies through the root pnpm config. No auth here: the app (apps/main) is its own origin,
 * reached through lib/app-links.ts.
 */

import createMDX from '@next/mdx';

/*
 * MDX for content/{blog,guides,changelog}/*.mdx (imported through content/generated/bodies.ts, compiled at build).
 * Plugins are named as STRINGS, never imported functions (gurukulhq paid for this): @next/mdx resolves a string itself,
 * and a function reference does not survive being handed to a loader as JSON. remark-gfm gives tables, strikethrough
 * and autolinks (without it every `| a | b |` row renders as pipes); remark-frontmatter strips the --- block so it is
 * not printed (scripts/build-content.ts reads it).
 */
const withMDX = createMDX({
    options: {
        remarkPlugins: ['remark-frontmatter', ['remark-gfm', {}]],
        rehypePlugins: [],
        // Always the production JSX runtime. In dev, MDX otherwise emits jsxDEV from react/jsx-dev-runtime, which in the
        // server-component layer reads React internals that are not there and every post 500s with "Cannot read
        // properties of undefined (reading 'recentlyCreatedOwnerStacks')" (seen 2026-11-24).
        development: false,
    },
});

const securityHeaders = [
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
    // A second dev server on the same app needs its own build directory: `NEXT_DIST_DIR=.next-3102 next dev ...`.
    distDir: process.env.NEXT_DIST_DIR || '.next',
    devIndicators: { position: 'bottom-right' },
    // Types are checked by `check-types`, not inside `next build`.
    typescript: { ignoreBuildErrors: true },
    // Next leaves the production SERVER build at webpack's defaults, so a module shared by many routes is copied into each
    // route's file. Let shared modules become chunks (same hook as apps/main).
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
    async headers() {
        return [
            { source: '/(.*)', headers: securityHeaders },
            // Content-hashed build assets never change under a given name. Production only: in development chunk URLs are
            // reused across rebuilds and `immutable` would serve stale chunks.
            ...(process.env.NODE_ENV === 'development'
                ? []
                : [{ source: '/_next/static/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }]),
        ];
    },
};

export default withMDX(nextConfig);
