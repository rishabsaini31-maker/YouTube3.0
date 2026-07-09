import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';

const sqlite = new Database('./db/custom.db');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration from SQLite to Postgres...');

  // 1. Profile
  const profiles = sqlite.prepare('SELECT * FROM Profile').all() as any[];
  if (profiles.length > 0) {
    console.log(`Migrating ${profiles.length} profiles...`);
    for (const p of profiles) {
      await prisma.profile.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          userId: p.userId,
          name: p.name,
          username: p.username,
          email: p.email,
          avatarUrl: p.avatarUrl,
          bannerUrl: p.bannerUrl,
          bio: p.bio,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt)
        }
      });
    }
  }

  // 2. Channel
  const channels = sqlite.prepare('SELECT * FROM Channel').all() as any[];
  if (channels.length > 0) {
    console.log(`Migrating ${channels.length} channels...`);
    for (const c of channels) {
      await prisma.channel.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          profileId: c.profileId,
          name: c.name,
          handle: c.handle,
          description: c.description,
          avatarUrl: c.avatarUrl,
          bannerUrl: c.bannerUrl,
          subscriberCount: c.subscriberCount,
          videoCount: c.videoCount,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt)
        }
      });
    }
  }

  // 3. Video
  const videos = sqlite.prepare('SELECT * FROM Video').all() as any[];
  if (videos.length > 0) {
    console.log(`Migrating ${videos.length} videos...`);
    for (const v of videos) {
      await prisma.video.upsert({
        where: { id: v.id },
        update: {},
        create: {
          id: v.id,
          channelId: v.channelId,
          title: v.title,
          description: v.description,
          thumbnailUrl: v.thumbnailUrl,
          videoUrl: v.videoUrl,
          duration: v.duration,
          category: v.category,
          tags: v.tags,
          viewCount: v.viewCount,
          likeCount: v.likeCount,
          dislikeCount: v.dislikeCount,
          commentCount: v.commentCount,
          isPublic: v.isPublic === 1,
          createdAt: new Date(v.createdAt),
          updatedAt: new Date(v.updatedAt)
        }
      });
    }
  }

  // 4. Comment
  const comments = sqlite.prepare('SELECT * FROM Comment').all() as any[];
  if (comments.length > 0) {
    console.log(`Migrating ${comments.length} comments...`);
    for (const c of comments) {
      await prisma.comment.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          videoId: c.videoId,
          profileId: c.profileId,
          parentId: c.parentId,
          content: c.content,
          likeCount: c.likeCount,
          isEdited: c.isEdited === 1,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt)
        }
      });
    }
  }

  // 5. Like
  const likes = sqlite.prepare('SELECT * FROM "Like"').all() as any[];
  if (likes.length > 0) {
    console.log(`Migrating ${likes.length} likes...`);
    for (const l of likes) {
      await prisma.like.upsert({
        where: { id: l.id },
        update: {},
        create: {
          id: l.id,
          profileId: l.profileId,
          videoId: l.videoId,
          commentId: l.commentId,
          type: l.type,
          createdAt: new Date(l.createdAt)
        }
      });
    }
  }

  // 6. Subscription
  const subscriptions = sqlite.prepare('SELECT * FROM Subscription').all() as any[];
  if (subscriptions.length > 0) {
    console.log(`Migrating ${subscriptions.length} subscriptions...`);
    for (const s of subscriptions) {
      await prisma.subscription.upsert({
        where: { id: s.id },
        update: {},
        create: {
          id: s.id,
          subscriberId: s.subscriberId,
          targetId: s.targetId,
          createdAt: new Date(s.createdAt)
        }
      });
    }
  }

  // 7. WatchHistory
  const history = sqlite.prepare('SELECT * FROM WatchHistory').all() as any[];
  if (history.length > 0) {
    console.log(`Migrating ${history.length} watch history entries...`);
    for (const h of history) {
      await prisma.watchHistory.upsert({
        where: { id: h.id },
        update: {},
        create: {
          id: h.id,
          profileId: h.profileId,
          videoId: h.videoId,
          watchedAt: new Date(h.watchedAt)
        }
      });
    }
  }

  // 8. WatchLater
  const watchLater = sqlite.prepare('SELECT * FROM WatchLater').all() as any[];
  if (watchLater.length > 0) {
    console.log(`Migrating ${watchLater.length} watch later entries...`);
    for (const wl of watchLater) {
      await prisma.watchLater.upsert({
        where: { id: wl.id },
        update: {},
        create: {
          id: wl.id,
          profileId: wl.profileId,
          videoId: wl.videoId,
          addedAt: new Date(wl.addedAt)
        }
      });
    }
  }

  console.log('Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    sqlite.close();
  });
