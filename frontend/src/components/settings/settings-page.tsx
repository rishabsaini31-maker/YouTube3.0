'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ErrorState } from '@/components/shared/error-state'
import { profileService, type ProfileFormData } from '@/services/profile-service'
import { useAuthStore } from '@/stores/auth-store'
import type { Profile } from '@/types'
import { Camera, Loader2, Save, User, Tv } from 'lucide-react'
import { toast } from 'sonner'

export function SettingsPage() {
  const { fetchSession } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [channelName, setChannelName] = useState('')
  const [channelDescription, setChannelDescription] = useState('')

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [hasChanges, setHasChanges] = useState(false)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await profileService.getProfile()
      const p = (res as { data: Profile }).data
      setProfile(p)
      setName(p.name)
      setUsername(p.username)
      setBio(p.bio || '')
      if (p.channel) {
        setChannelName(p.channel.name)
        setChannelDescription(p.channel.description || '')
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    if (!profile) return
    const changed =
      name !== profile.name ||
      username !== profile.username ||
      (bio || null) !== profile.bio ||
      (profile.channel ? channelName !== profile.channel.name : channelName !== '') ||
      (profile.channel
        ? (channelDescription || null) !== profile.channel.description
        : channelDescription !== '')
    setHasChanges(changed)
  }, [name, username, bio, channelName, channelDescription, profile])

  const validate = (): boolean => {
    const errors: Record<string, string> = {}

    if (!name.trim()) {
      errors.name = 'Name is required'
    }

    if (!username.trim()) {
      errors.username = 'Username is required'
    } else if (username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters'
    } else if (!/^[a-z0-9._-]+$/.test(username.trim().toLowerCase())) {
      errors.username = 'Only lowercase letters, numbers, dots, underscores, hyphens'
    }

    if (channelName.trim() && channelName.trim().length > 50) {
      errors.channelName = 'Channel name must be 50 characters or less'
    }

    if (channelDescription && channelDescription.length > 1000) {
      errors.channelDescription = 'Description must be 1000 characters or less'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return

    setSaving(true)
    try {
      const data: ProfileFormData = {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim() || undefined,
        channelName: channelName.trim() || undefined,
        channelDescription: channelDescription.trim() || undefined,
      }

      const res = await profileService.updateProfile(data)
      const updated = (res as { data: Profile }).data
      setProfile(updated)
      setHasChanges(false)
      await fetchSession()
      toast.success('Profile updated successfully')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to update profile'
      if (message.includes('already taken')) {
        setFieldErrors((prev) => ({ ...prev, username: 'Username is already taken' }))
      } else {
        toast.error(message)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Invalid file type. Use JPEG, PNG, WebP, or GIF.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.')
      return
    }

    setUploading(true)
    try {
      const res = await profileService.uploadAvatar(file)
      const { avatarUrl } = (res as { data: { avatarUrl: string } }).data

      if (profile) {
        setProfile({ ...profile, avatarUrl })
      }
      await fetchSession()
      toast.success('Avatar updated')
    } catch {
      toast.error('Failed to upload avatar')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="p-4 sm:p-6">
          <h1 className="text-xl font-bold mb-6">Settings</h1>
          <div className="max-w-2xl space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-6 space-y-4 animate-pulse">
                <div className="h-5 w-40 bg-muted rounded" />
                <div className="h-3 w-64 bg-muted rounded" />
                <div className="h-10 w-full bg-muted rounded" />
                <div className="h-10 w-full bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard>
        <div className="p-4 sm:p-6">
          <h1 className="text-xl font-bold mb-6">Settings</h1>
          <ErrorState title="Failed to load profile" onRetry={fetchProfile} />
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-xl font-bold">Settings</h1>
        </div>

        <div className="max-w-2xl space-y-6">
          {/* Avatar Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile Picture
              </CardTitle>
              <CardDescription>Choose a profile picture to help others recognize you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage
                      src={profile?.avatarUrl || undefined}
                      alt={profile?.name || ''}
                    />
                    <AvatarFallback className="text-2xl bg-zinc-700 text-white">
                      {profile?.name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {uploading && (
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAvatarClick}
                    disabled={uploading}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Change picture
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPEG, PNG, WebP, or GIF. Max 5MB.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Profile Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  maxLength={50}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-destructive">{fieldErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    @
                  </span>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    maxLength={30}
                    className="pl-8"
                  />
                </div>
                {fieldErrors.username && (
                  <p className="text-xs text-destructive">{fieldErrors.username}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Only lowercase letters, numbers, dots, underscores, and hyphens.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people a little about yourself..."
                  maxLength={500}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {bio.length}/500
                </p>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile?.email || ''} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if you need to update it.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Channel Settings */}
          {profile?.channel && (
            <>
              <Separator />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tv className="h-4 w-4" />
                    Channel Settings
                  </CardTitle>
                  <CardDescription>Customize your channel appearance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="channelName">Channel Name</Label>
                    <Input
                      id="channelName"
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      placeholder="Your channel name"
                      maxLength={50}
                    />
                    {fieldErrors.channelName && (
                      <p className="text-xs text-destructive">{fieldErrors.channelName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="channelDescription">Channel Description</Label>
                    <Textarea
                      id="channelDescription"
                      value={channelDescription}
                      onChange={(e) => setChannelDescription(e.target.value)}
                      placeholder="Describe what your channel is about..."
                      maxLength={1000}
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {channelDescription.length}/1000
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}