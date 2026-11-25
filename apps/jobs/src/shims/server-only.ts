// wrangler.jsonc `alias` maps "server-only" here. @repo/ai imports it to keep its code out of Next client bundles; a
// plain Worker has no client bundle, and the real package throws when imported outside Next's react-server condition.
export {}
