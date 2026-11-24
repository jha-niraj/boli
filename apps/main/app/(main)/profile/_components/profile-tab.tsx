"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { BadgeCheck, CalendarDays, Camera, KeyRound } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/ui/avatar"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { toast } from "@repo/ui/components/ui/toast"
import { getAvatarUploadUrl, removeAvatar, saveAvatar, updateProfileDetails } from "@/actions/profile.action"
import type { ProfileData } from "@/types/profile"
import { AVATAR_ACCEPT, cropAvatar } from "./avatar-image"
import { Section, initials } from "./section"

export function ProfileTabPanel({ profile }: { profile: ProfileData }) {
    return (
        <>
            <PhotoSection profile={profile} />
            <DetailsSection profile={profile} />
        </>
    )
}

function PhotoSection({ profile }: { profile: ProfileData }) {
    const router = useRouter()
    const fileRef = React.useRef<HTMLInputElement>(null)
    const [src, setSrc] = React.useState<string | null>(profile.avatarSrc)
    const [uploaded, setUploaded] = React.useState(profile.hasUploadedAvatar)
    const [busy, setBusy] = React.useState(false)

    async function onFile(file: File) {
        setBusy(true)
        try {
            const blob = await cropAvatar(file)
            const presign = await getAvatarUploadUrl({ contentType: "image/jpeg", size: blob.size })
            if (!presign.success) throw new Error(presign.error ?? "Could not start the upload.")
            const put = await fetch(presign.data.uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } })
            if (!put.ok) throw new Error("The upload did not go through. Try again.")
            const saved = await saveAvatar(presign.data.key)
            if (!saved.success) throw new Error(saved.error ?? "Could not save the photo.")
            setSrc(saved.data.src)
            setUploaded(true)
            toast.success("Photo updated")
            router.refresh()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not update the photo.")
        } finally {
            setBusy(false)
            if (fileRef.current) fileRef.current.value = ""
        }
    }

    async function onRemove() {
        const res = await removeAvatar()
        if (!res.success) {
            toast.error(res.error ?? "Could not remove the photo.")
            throw new Error("remove failed")
        }
        setSrc(null)
        setUploaded(false)
        toast.success("Photo removed")
        router.refresh()
    }

    const joined = new Date(profile.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
    const methods = [
        profile.providers.includes("google") && "Google",
        profile.hasPassword && "Email and password",
        "Email code",
    ].filter((m): m is string => Boolean(m))

    // The identity card: who this account is at a glance, with the photo controls beside it.
    return (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                <div className="relative shrink-0 self-start sm:self-center">
                    <Avatar className="size-20 ring-4 ring-neutral-100 dark:ring-neutral-800">
                        {src && <AvatarImage src={src} alt="" />}
                        <AvatarFallback className="bg-neutral-100 text-xl font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                            {initials(profile.name, profile.email)}
                        </AvatarFallback>
                    </Avatar>
                    {profile.storageReady && (
                        <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            aria-label={src ? "Change photo" : "Upload photo"}
                            disabled={busy}
                            onClick={() => fileRef.current?.click()}
                            className="absolute -bottom-1 -right-1 rounded-full bg-white shadow-sm dark:bg-neutral-900"
                        >
                            {busy ? <InlineLoader size={12} /> : <Camera className="size-3.5" />}
                        </Button>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold text-neutral-900 dark:text-white">{profile.name || "Your name"}</h2>
                    <div className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <span className="truncate">{profile.email}</span>
                        {profile.emailVerified ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                <BadgeCheck className="size-3.5" /> Verified
                            </span>
                        ) : (
                            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Not verified</span>
                        )}
                    </div>
                    <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                        <div className="flex items-center gap-1.5"><CalendarDays className="size-3.5" /><dt className="sr-only">Joined</dt><dd>Joined {joined}</dd></div>
                        <div className="flex items-center gap-1.5"><KeyRound className="size-3.5" /><dt className="sr-only">Sign-in</dt><dd>Signs in with {methods.join(", ")}</dd></div>
                    </dl>
                </div>

                {profile.storageReady ? (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {/* The native file input is hidden; the shadcn Buttons open it. */}
                        <input ref={fileRef} type="file" accept={AVATAR_ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f) }} />
                        <Button type="button" variant="outline" size="sm" className="gap-2" disabled={busy} onClick={() => fileRef.current?.click()}>
                            <Camera className="size-4" />
                            {src ? "Change photo" : "Upload photo"}
                        </Button>
                        {uploaded && (
                            <ConfirmPopover title="Remove your photo?" description="Your initials show instead." confirmLabel="Remove" onConfirm={onRemove}>
                                <Button type="button" variant="ghost" size="sm" disabled={busy}>Remove</Button>
                            </ConfirmPopover>
                        )}
                    </div>
                ) : null}
            </div>
            {!profile.storageReady && (
                <p className="mt-4 text-xs text-neutral-600 dark:text-neutral-400">
                    Photo uploads turn on once R2 storage is configured (the R2_* keys in .env.local).
                </p>
            )}
        </section>
    )
}

function DetailsSection({ profile }: { profile: ProfileData }) {
    const router = useRouter()
    const [name, setName] = React.useState(profile.name)
    const [bio, setBio] = React.useState(profile.bio)
    const [saved, setSaved] = React.useState({ name: profile.name, bio: profile.bio })
    const [busy, setBusy] = React.useState(false)
    const dirty = name.trim() !== saved.name || bio.trim() !== saved.bio

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setBusy(true)
        const res = await updateProfileDetails({ name, bio })
        setBusy(false)
        if (!res.success) {
            toast.error(res.error ?? "Could not save your details.")
            return
        }
        setSaved(res.data)
        setName(res.data.name)
        setBio(res.data.bio)
        toast.success("Saved")
        router.refresh()
    }

    return (
        <form onSubmit={onSubmit}>
            <Section
                title="Details"
                description="Your name is what other people see."
                footer={
                    <Button type="submit" size="sm" disabled={!dirty || busy} className="gap-1.5">
                        {busy && <InlineLoader size={14} className="text-current" />}
                        Save changes
                    </Button>
                }
            >
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="profile-name">Name</Label>
                        <Input id="profile-name" value={name} maxLength={80} required onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="profile-email">Email</Label>
                        <Input id="profile-email" value={profile.email} disabled readOnly />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="profile-bio">Bio</Label>
                        <Textarea id="profile-bio" value={bio} maxLength={280} rows={3} placeholder="A line about you" className="field-sizing-content min-h-20" onChange={(e) => setBio(e.target.value)} />
                        <p className="text-right text-xs text-neutral-600 dark:text-neutral-400">{bio.length}/280</p>
                    </div>
                </div>
            </Section>
        </form>
    )
}
