import * as React from "react"
import { cn } from "../../lib/utils"

export interface TextareaProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

/**
 * NO FOCUS RING (owner, 2026-11-25): focus shows as the border darkening, nothing around the field. The
 * history below is why an offset ring must never come back.
 *
 * This used to be `focus:ring-2 focus:ring-ring focus:ring-offset-2`. `ring-offset-2` paints a 2px
 * band of `--tw-ring-offset-color` BETWEEN the control and its ring, and nothing in this repo ever
 * sets that variable - Tailwind's initial value for it is `#fff`. So every focused textarea in the
 * app wore a hard WHITE hairline around it: on a light sheet it read as a focus ring stuck on, and
 * in dark mode it was a glaring white outline on a neutral-900 field. It showed the instant a sheet
 * opened rather than on a deliberate focus, because Radix autofocuses the first tabbable element
 * and in a message sheet that is the textarea.
 *
 * `input.tsx` in this same folder already had it right - the border darkening - so this is the shared control being brought back in line rather than
 * a call site being patched. The two controls sit next to each other in half the forms in the app
 * and used to focus differently.
 *
 * The comments live OUT here, not inside the class template literal. `cn` joins that string
 * verbatim, so anything written between the classes is emitted into the DOM's `class` attribute -
 * and a comment that mentioned `ring-offset-2` would have shipped it as a real class and put the
 * white band straight back.
 *
 * `resize-none field-sizing-content`: the box grows with what is typed (up to whatever max-h the caller
 * sets), so there is no drag grabber anywhere - on a phone it was a decoration that let a stray drag
 * reflow the form, and on a desktop it was one more thing to fiddle with (owner, 2026-11-23).
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ className, ...props }, ref) => {
		return (
			<textarea
				ref={ref}
				className={cn(
					`
						flex min-h-[96px] w-full
						rounded-xl border
						bg-neutral-950/[0.03] dark:bg-white/[0.04]
						border-neutral-950/[0.07] dark:border-white/[0.08]
						px-3 py-2 text-sm

						resize-none field-sizing-content

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
	}
)
Textarea.displayName = "Textarea"

export { Textarea }
