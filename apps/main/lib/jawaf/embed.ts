import "server-only"

// Moved to @repo/jawaf (packages/jawaf/src/embed.ts) so the boli-jobs Worker runs the same code. Re-exported here so
// every import in this app stays as it was.
export * from "@repo/jawaf/embed"
