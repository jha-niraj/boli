"use client"

import * as React from "react"
import { ArrowLeft, Check, ChevronDown, PenLine } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command"
import { Input } from "./input"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { ScrollArea } from "./scroll-area"

/**
 * One choosable value. `value` is what is stored (often the label itself, so a typed "Other" value is just another
 * string); `group` puts it under a heading (a province); `hint` is a quiet second line on the right (a district);
 * `keywords` are extra words search matches (an old name, "Mahendranagar" for Bhimdatta).
 */
export interface ComboOption {
	value: string
	label: string
	group?: string
	hint?: string
	keywords?: readonly string[]
}

export interface ComboSelectProps {
	value: string
	onValueChange: (value: string) => void
	options: readonly ComboOption[]
	/** Adds an "Other" item that turns the control into a text field, so the value can be anything. */
	allowOther?: boolean
	/** The Other item's label. */
	otherLabel?: string
	/** Placeholder of the text field once Other is chosen. */
	otherPlaceholder?: string
	/** Max length of a typed Other value. */
	otherMaxLength?: number
	placeholder?: string
	searchPlaceholder?: string
	/** Shown when nothing matches the search, or when there are no options at all. */
	emptyMessage?: string
	disabled?: boolean
	/** On the trigger, and on the text field once Other is chosen. */
	className?: string
	id?: string
	/** For a plain `<form>` read with FormData: the value goes out in a hidden field of this name. */
	name?: string
	size?: "sm" | "default"
	"aria-invalid"?: boolean
	"aria-describedby"?: string
	"aria-label"?: string
}

const OTHER_ITEM = "__combo_other__"

/**
 * A searchable select: a trigger like SelectTrigger, a popover with a search box and the options (grouped when they
 * carry a `group`) in a ScrollArea capped at 18rem. With `allowOther`, an "Other" item at the end switches the control
 * into a text field (search text carried over) with a "Back to the list" button. Controlled; works inside a Sheet (the
 * sheet keeps itself open for a press inside a popper) and inside a form (no native controls; `name` adds a hidden
 * field). The popover is the trigger's width, at least 16rem, so it reads on a 390px phone.
 *
 * Plain `Select` stays the choice for a short fixed list (a status, a priority); this one is for long lists, lists
 * people search by name (a city, a sector, a person) and lists that need "Other".
 */
export function ComboSelect({
	value,
	onValueChange,
	options,
	allowOther = false,
	otherLabel = "Other",
	otherPlaceholder = "Type it",
	otherMaxLength,
	placeholder = "Choose",
	searchPlaceholder = "Search",
	emptyMessage = "Nothing matches",
	disabled,
	className,
	id,
	name,
	size = "default",
	"aria-invalid": ariaInvalid,
	"aria-describedby": ariaDescribedBy,
	"aria-label": ariaLabel,
}: ComboSelectProps) {
	const [open, setOpen] = React.useState(false)
	const [search, setSearch] = React.useState("")
	const known = React.useCallback((v: string) => options.some((o) => o.value === v), [options])
	const startsTyped = (v: string) => allowOther && v.trim() !== "" && !known(v)
	const [typing, setTyping] = React.useState(() => startsTyped(value))
	const textRef = React.useRef<HTMLInputElement>(null)
	const triggerRef = React.useRef<HTMLButtonElement>(null)

	// A value set from outside (a reset, a prefill) decides the mode again; a value this field typed itself does not.
	const [seen, setSeen] = React.useState(value)
	if (seen !== value) {
		setSeen(value)
		setTyping(startsTyped(value))
	}

	const selected = options.find((o) => o.value === value)

	// Groups in the order the options list them; options without a group sit under no heading.
	const groups = React.useMemo(() => {
		const map = new Map<string, ComboOption[]>()
		for (const o of options) {
			const key = o.group ?? ""
			const list = map.get(key)
			if (list) list.push(o)
			else map.set(key, [o])
		}
		return [...map.entries()]
	}, [options])

	const pick = (v: string) => {
		setSeen(v)
		onValueChange(v)
		setOpen(false)
		setSearch("")
	}

	const chooseOther = () => {
		const start = search.trim()
		setSeen(start)
		setTyping(true)
		onValueChange(start)
		setOpen(false)
		setSearch("")
		// After the popover hands focus back to the trigger, move it into the text field.
		window.setTimeout(() => textRef.current?.focus(), 0)
	}

	const backToList = () => {
		setSeen("")
		setTyping(false)
		onValueChange("")
		window.setTimeout(() => {
			triggerRef.current?.focus()
			setOpen(true)
		}, 0)
	}

	// A hidden field is not a control (nothing to see or press), so it is the one plain <input> here.
	const hidden = name ? <input type="hidden" name={name} value={value} /> : null
	const height = size === "sm" ? "h-8 text-xs" : "h-9 text-sm"

	if (typing) {
		return (
			<div className="flex w-full min-w-0 items-center gap-1.5">
				{hidden}
				<Input
					ref={textRef}
					id={id}
					value={value}
					onChange={(e) => {
						setSeen(e.target.value)
						onValueChange(e.target.value)
					}}
					placeholder={otherPlaceholder}
					maxLength={otherMaxLength}
					disabled={disabled}
					aria-invalid={ariaInvalid}
					aria-describedby={ariaDescribedBy}
					aria-label={ariaLabel}
					className={cn("min-w-0 flex-1", height, className)}
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					disabled={disabled}
					onClick={backToList}
					aria-label="Back to the list"
					title="Back to the list"
					className={cn("shrink-0 cursor-pointer rounded-full text-neutral-500 dark:text-neutral-400", size === "sm" ? "size-8" : "size-9")}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
			</div>
		)
	}

	const hasOptions = options.length > 0

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next)
				if (!next) setSearch("")
			}}
		>
			{hidden}
			<PopoverTrigger asChild>
				<Button
					ref={triggerRef}
					id={id}
					type="button"
					variant="outline"
					role="combobox"
					aria-expanded={open}
					aria-haspopup="listbox"
					aria-invalid={ariaInvalid}
					aria-describedby={ariaDescribedBy}
					aria-label={ariaLabel}
					disabled={disabled}
					onKeyDown={(e) => {
						if (e.key === "ArrowDown" && !open) {
							e.preventDefault()
							setOpen(true)
						}
					}}
					className={cn(
						"flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 font-medium ring-offset-0 focus-visible:ring-offset-0",
						"border-neutral-950/[0.07] bg-neutral-950/[0.03] text-neutral-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-neutral-200",
						"transition-colors hover:bg-neutral-950/[0.05] dark:hover:bg-white/[0.06]",
						"focus-visible:border-neutral-400 focus-visible:outline-none focus-visible:ring-0 dark:focus-visible:border-neutral-500",
						"data-[state=open]:border-neutral-400 dark:data-[state=open]:border-neutral-500",
						"disabled:cursor-not-allowed disabled:opacity-50",
						height,
						className,
					)}
				>
					<span className={cn("min-w-0 flex-1 truncate text-left", !selected && "font-normal text-neutral-400 dark:text-neutral-500")}>
						{selected ? selected.label : placeholder}
					</span>
					<ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-[var(--radix-popover-trigger-width)] min-w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl p-0"
				onOpenAutoFocus={(e) => {
					// On a phone a focused search field throws the keyboard over half the list; tap the field to search.
					const fine = typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches
					if (!fine) e.preventDefault()
				}}
			>
				<Command loop filter={containsFilter} className="rounded-2xl bg-transparent">
					<CommandInput value={search} onValueChange={setSearch} placeholder={searchPlaceholder} className="h-10" />
					<CommandList className="max-h-none overflow-visible">
						<ScrollArea orientation="vertical" viewportClassName="max-h-[18rem]">
							<div className="min-w-0 p-1">
								<CommandEmpty className="px-3 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
									{emptyMessage}
									{allowOther ? <span className="mt-1 block text-xs">Choose {otherLabel} to type it.</span> : null}
								</CommandEmpty>
								{hasOptions
									? groups.map(([group, items]) => (
										<CommandGroup key={group || "_"} heading={group || undefined} className="p-0">
											{items.map((o) => (
												<CommandItem
													key={o.value}
													value={o.value}
													keywords={[o.label, ...(o.hint ? [o.hint] : []), ...(o.group ? [o.group] : []), ...(o.keywords ?? [])]}
													onSelect={() => pick(o.value)}
													className="cursor-pointer rounded-lg"
												>
													<Check aria-hidden className={cn("h-4 w-4 shrink-0", o.value === value ? "opacity-100" : "opacity-0")} />
													<span className="min-w-0 flex-1 truncate">{o.label}</span>
													{o.hint ? <span className="shrink-0 truncate text-xs text-neutral-500 dark:text-neutral-400">{o.hint}</span> : null}
												</CommandItem>
											))}
										</CommandGroup>
									))
									: null}
								{allowOther ? (
									<CommandGroup forceMount className="border-t border-neutral-200 p-0 pt-1 dark:border-neutral-800">
										<CommandItem forceMount value={OTHER_ITEM} onSelect={chooseOther} className="cursor-pointer rounded-lg">
											<PenLine aria-hidden className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
											<span className="min-w-0 flex-1 truncate">
												{search.trim() ? `${otherLabel}: "${search.trim()}"` : `${otherLabel} - type it`}
											</span>
										</CommandItem>
									</CommandGroup>
								) : null}
							</div>
						</ScrollArea>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}

/**
 * Plain "contains" search instead of cmdk's fuzzy score: fuzzy matched letters scattered across a whole option ("pokh"
 * found Mechinagar through "Koshi Province"). Every word typed must appear, in order-free fashion, in the option's
 * value + keywords (label, hint, group, extra names); matches at a word start rank first.
 */
function containsFilter(value: string, search: string, keywords?: string[]): number {
	const hay = `${value} ${(keywords ?? []).join(" ")}`.toLowerCase()
	const words = search.toLowerCase().trim().split(/\s+/).filter(Boolean)
	if (words.length === 0) return 1
	let score = 0
	for (const w of words) {
		const i = hay.indexOf(w)
		if (i < 0) return 0
		score += i === 0 || /[\s(,-]/.test(hay[i - 1] ?? "") ? 2 : 1
	}
	return score / (words.length * 2)
}

