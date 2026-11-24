import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

// Incremental cache in R2 (binding NEXT_INC_CACHE_R2_BUCKET). The site is mostly static: without a cache OpenNext has
// nowhere to keep the prerendered HTML and re-renders every page on every request. The bucket is shared with apps/main;
// NEXT_INC_CACHE_R2_PREFIX (wrangler.jsonc vars) keeps this app's entries apart. Kept MINIMAL on purpose: no
// enableCacheInterception, no regional cache, no DO tag cache - those caused intermittent production 500s elsewhere.
export default defineCloudflareConfig({
    incrementalCache: r2IncrementalCache,
});
