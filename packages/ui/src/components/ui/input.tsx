import * as React from "react"
import { cn } from "../../lib/utils"

const Input = React.forwardRef<
	HTMLInputElement,
	React.ComponentProps<"input">
>(({ className, type, ...props }, ref) => {
	return (
		<input
			ref={ref}
			type={type}
			className={cn(
				`
					flex h-9 w-full
					rounded-xl border
					bg-neutral-950/[0.03] dark:bg-white/[0.04]
					border-neutral-950/[0.07] dark:border-white/[0.08]
					px-3 text-sm

					text-neutral-900 dark:text-neutral-100
					placeholder:text-neutral-400 dark:placeholder:text-neutral-500

					transition-colors
					hover:bg-neutral-950/[0.05] dark:hover:bg-white/[0.06]

					focus-visible:outline-none
					focus-visible:border-neutral-400 dark:focus-visible:border-neutral-500

					disabled:cursor-not-allowed
					disabled:opacity-50
        		`,
				className
			)}
			{...props}
		/>
	)
})
Input.displayName = "Input"

export { Input }