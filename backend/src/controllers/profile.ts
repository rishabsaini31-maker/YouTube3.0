import { Request, Response } from 'express';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { saveFile } from '@/lib/storage'
import { UPLOAD_LIMITS } from '@/types'

export async function GET(req: Request, res: Response) {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! },
      include: { channel: true },
    })

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    return res.status(200).json({
      data: {
        id: profile.id,
        userId: profile.userId,
        name: profile.name,
        username: profile.username,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        bannerUrl: profile.bannerUrl,
        bio: profile.bio,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
        channel: profile.channel
          ? {
              id: profile.channel.id,
              profileId: profile.channel.profileId,
              name: profile.channel.name,
              handle: profile.channel.handle,
              description: profile.channel.description,
              avatarUrl: profile.channel.avatarUrl,
              bannerUrl: profile.channel.bannerUrl,
              subscriberCount: profile.channel.subscriberCount,
              videoCount: profile.channel.videoCount,
              createdAt: profile.channel.createdAt.toISOString(),
              updatedAt: profile.channel.updatedAt.toISOString(),
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return res.json({ error: 'Failed to fetch profile' })
  }
}

export const PUT = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! },
      include: { channel: true },
    })

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const body = req.body
    const { name, username, bio, channelName, channelDescription } = body

    if (name !== undefined && (!name || name.trim().length === 0)) {
      return res.status(400).json({ error: 'Name is required' })
    }

    if (username !== undefined) {
      const trimmed = username.trim().toLowerCase()
      if (!trimmed || trimmed.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' })
      }
      if (!/^[a-z0-9._-]+$/.test(trimmed)) {
        return res.status(400).json({ error: 'Username can only contain lowercase letters, numbers, dots, underscores, and hyphens' })
      }

      const existing = await db.profile.findUnique({ where: { username: trimmed } })
      if (existing && existing.id !== profile.id) {
        return res.status(409).json({ error: 'Username is already taken' })
      }
    }

    const updatedProfile = await db.profile.update({
      where: { id: profile.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(username !== undefined ? { username: username.trim().toLowerCase() } : {}),
        ...(bio !== undefined ? { bio: bio.trim() || null } : {}),
      },
      include: { channel: true },
    })

    if (profile.channel) {
      const channelUpdateData: Record<string, unknown> = {}
      if (channelName !== undefined) channelUpdateData.name = channelName.trim()
      if (channelDescription !== undefined) channelUpdateData.description = channelDescription.trim() || null

      if (Object.keys(channelUpdateData).length > 0) {
        await db.channel.update({
          where: { id: profile.channel.id },
          data: channelUpdateData,
        })
      }
    }

    // Re-fetch with channel to return complete data
    const refreshedProfile = await db.profile.findUnique({
      where: { id: profile.id },
      include: { channel: true },
    })

    return res.status(200).json({
      data: {
        id: refreshedProfile!.id,
        userId: refreshedProfile!.userId,
        name: refreshedProfile!.name,
        username: refreshedProfile!.username,
        email: refreshedProfile!.email,
        avatarUrl: refreshedProfile!.avatarUrl,
        bannerUrl: refreshedProfile!.bannerUrl,
        bio: refreshedProfile!.bio,
        createdAt: refreshedProfile!.createdAt.toISOString(),
        updatedAt: refreshedProfile!.updatedAt.toISOString(),
        channel: refreshedProfile!.channel
          ? {
              id: refreshedProfile!.channel.id,
              profileId: refreshedProfile!.channel.profileId,
              name: refreshedProfile!.channel.name,
              handle: refreshedProfile!.channel.handle,
              description: refreshedProfile!.channel.description,
              avatarUrl: refreshedProfile!.channel.avatarUrl,
              bannerUrl: refreshedProfile!.channel.bannerUrl,
              subscriberCount: refreshedProfile!.channel.subscriberCount,
              videoCount: refreshedProfile!.channel.videoCount,
              createdAt: refreshedProfile!.channel.createdAt.toISOString(),
              updatedAt: refreshedProfile!.channel.updatedAt.toISOString(),
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return res.json({ error: 'Failed to update profile' })
  }
}

export const POST = async (req: Request, res: Response) => {
  try {
    const session = { user: (req as any).user };
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id! },
    })

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File | null

    if (!file) {
      return res.status(400).json({ error: 'Avatar file is required' })
    }

    if (!UPLOAD_LIMITS.acceptedImageTypes.includes(file.type)) {
      return res.status(400).json({ error: 'Invalid file type. Accepted: JPEG, PNG, WebP, GIF' })
    }

    if (file.size > UPLOAD_LIMITS.maxAvatarSize) {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB' })
    }

    const avatarUrl = await saveFile(file, 'avatars', profile.id)

    await db.profile.update({
      where: { id: profile.id },
      data: { avatarUrl },
    })

    if (profile.channel) {
      await db.channel.update({
        where: { id: profile.channel.id },
        data: { avatarUrl },
      })
    }

    return res.status(200).json({
      data: { avatarUrl },
    })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return res.json({ error: 'Failed to upload avatar' })
  }
}