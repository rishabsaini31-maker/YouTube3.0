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
import { Badge } from '@/components/ui/badge'
import { ErrorState } from '@/components/shared/error-state'
import { profileService, type ProfileFormData } from '@/services/profile-service'
import { sessionService } from '@/services/session-service'
import { subscriptionService } from '@/services/subscription-plan-service'
import { useAuthStore } from '@/stores/auth-store'
import { useRouterStore } from '@/stores/router-store'
import type { Profile, MembershipData, LoginSessionInfo, PaymentEntry } from '@/types'
import { Camera, Loader2, Save, User, Tv, Crown, Monitor, Globe, ShieldCheck, ShieldAlert, Trash2, Smartphone, Receipt, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { formatTimeAgo } from '@/lib/format'

const planBadgeVariants: Record<string, 'outline' | 'secondary' | 'default'> = {
  free: 'outline',
  bronze: 'secondary',
  silver: 'secondary',
  gold: 'default',
}

export function SettingsPage() {
  const { fetchSession } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [membershipData, setMembershipData] = useState<MembershipData | null>(null)
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

  // Login sessions state
  const [sessions, setSessions] = useState<LoginSessionInfo[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const [showPayments, setShowPayments] = useState(false)
  const [payments, setPayments] = useState<PaymentEntry[]>([])
  const { navigate } = useRouterStore()

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

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true)
    try {
      const res = await sessionService.getSessions()
      const data = (res as { data: LoginSessionInfo[] }).data
      setSessions(data || [])
    } catch {
      // Sessions are non-critical
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    if (!profile) return
    fetchSessions()
    subscriptionService.getMembership().then(res => {
      if (res.data) {
        setMembershipData(res.data)
        setPayments(res.data.payments)
      }
    }).catch(() => {})
  }, [profile, fetchSessions])

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

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId)
    try {
      await sessionService.revokeSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      toast.success('Session revoked')
    } catch {
      toast.error('Failed to revoke session')
    } finally {
      setRevokingId(null)
    }
  }

  const getDeviceIcon = (device: string | null) => {
    if (device === 'Mobile') return <Smartphone className="h-4 w-4" />
    return <Monitor className="h-4 w-4" />
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

  // Mark the first session as current (most recently active)
  const currentSessionId = sessions.length > 0 ? sessions[0].id : null

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

          {/* Subscription & Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Subscription & Plan
              </CardTitle>
              <CardDescription>Manage your subscription plan and billing</CardDescription>
            </CardHeader>
            <CardContent>
              {membershipData ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Crown className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{membershipData.currentPlan?.displayName}</span>
                          <Badge variant={planBadgeVariants[membershipData.currentPlan?.name || 'free'] || 'outline'} className="text-xs">
                            {(membershipData.currentPlan?.name || 'free').toUpperCase()}
                          </Badge>
                        </div>
                        {membershipData.membership ? (
                          <p className="text-sm text-muted-foreground">
                            Active since {formatTimeAgo(membershipData.membership.startedAt)}
                            {membershipData.membership.expiresAt && (
                              <> · Expires {new Date(membershipData.membership.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                            )}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">No active paid membership</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {membershipData.currentPlan?.name !== 'free' && membershipData.membership?.expiresAt && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Renewal Date</p>
                          <p className="text-sm font-medium">
                            {new Date(membershipData.membership.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      )}
                      <Button variant="outline" size="sm" onClick={() => navigate({ name: 'pricing' })}>
                        {membershipData.currentPlan?.name === 'free' ? 'Upgrade Plan' : 'Manage Plan'}
                      </Button>
                    </div>
                  </div>

                  {/* Payment History Toggle */}
                  {membershipData.paymentsTotal > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <Button
                        variant="ghost"
                        className="w-full justify-between"
                        onClick={() => setShowPayments(!showPayments)}
                      >
                        <span className="flex items-center gap-2">
                          <Receipt className="w-4 h-4" />
                          Payment History ({membershipData.paymentsTotal})
                        </span>
                        <ChevronDown className={cn('w-4 h-4 transition-transform', showPayments && 'rotate-180')} />
                      </Button>
                    </div>
                  )}

                  {/* Payment History List */}
                  {showPayments && payments.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto mt-2">
                      {payments.map((p) => (
                        <Card key={p.id} className="p-3 bg-muted/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded-md bg-background">
                                <Receipt className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-medium capitalize">{p.planId} Plan</p>
                                <p className="text-xs text-muted-foreground">
                                  {p.paidAt ? formatTimeAgo(p.paidAt) : formatTimeAgo(p.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">₹{Math.round(p.amount)}</p>
                              <Badge
                                variant={p.status === 'completed' ? 'outline' : 'destructive'}
                                className="text-xs px-1.5 py-0"
                              >
                                {p.status}
                              </Badge>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading subscription details...
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Login Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Login Sessions
              </CardTitle>
              <CardDescription>Manage devices where you&apos;re signed in</CardDescription>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="rounded-lg border p-4 animate-pulse space-y-2">
                      <div className="h-4 w-48 bg-muted rounded" />
                      <div className="h-3 w-32 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active sessions found.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {sessions.map((session) => {
                    const isCurrent = session.id === currentSessionId
                    return (
                      <div
                        key={session.id}
                        className="rounded-lg border p-4 flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="mt-0.5 text-muted-foreground flex-shrink-0">
                            {getDeviceIcon(session.device)}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">
                                {session.browser || 'Unknown Browser'}
                              </span>
                              <span className="text-muted-foreground text-sm">on</span>
                              <span className="text-sm">{session.os || 'Unknown OS'}</span>
                              {isCurrent && (
                                <Badge variant="secondary" className="text-xs">
                                  Current
                                </Badge>
                              )}
                              {session.isVerified ? (
                                <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600 dark:text-emerald-400">
                                  <ShieldCheck className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 dark:text-amber-400">
                                  <ShieldAlert className="h-3 w-3 mr-1" />
                                  Unverified
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Globe className="h-3 w-3" />
                              <span>{session.ip || 'Unknown IP'}</span>
                              <span>·</span>
                              <span>{session.location || 'Unknown Location'}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Last active: {formatDistanceToNow(new Date(session.lastActive), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        {!isCurrent && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={() => handleRevokeSession(session.id)}
                            disabled={revokingId === session.id}
                            aria-label="Revoke session"
                          >
                            {revokingId === session.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

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