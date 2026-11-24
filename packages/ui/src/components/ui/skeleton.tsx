import { cn } from "../../lib/utils"

/**
 * A placeholder block.
 *
 * Uses the sweeping `gk-shimmer` highlight rather than `animate-pulse`: a whole page of
 * blocks fading in unison reads as a stalled screen, while a sweep reads as work in
 * progress. Pass `delay` (seconds) so a group of blocks ripples instead of blinking as one.
 * Under `prefers-reduced-motion` the sweep drops out and the block sits still.
 *
 * `data-slot="skeleton"` is the theming hook: an app can retone every block from its own CSS (apps/main's warm sand,
 * app/boli.css) while the defaults here stay as they are for everyone else.
 *
 * `Shimmer` in `@repo/ui/components/skeleton-kit` is the same block; that module also holds
 * the layout-mirroring primitives (tables, stat rows, headers) that page skeletons compose.
 */
function Skeleton({
	className,
	delay,
	style,
	...props
}: React.HTMLAttributes<HTMLDivElement> & {
	/** Seconds to offset the sweep by, so a group ripples instead of pulsing as one. */
	delay?: number
}) {
	return (
		<div
			aria-hidden
			data-slot="skeleton"
			style={delay ? { ...style, animationDelay: `${delay}s` } : style}
			className={cn(
				"gk-shimmer rounded-md bg-neutral-200/80 dark:bg-neutral-800",
				className
			)}
			{...props}
		/>
	)
}

export { Skeleton }
