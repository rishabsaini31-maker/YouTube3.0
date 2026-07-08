import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient()

const CHANNELS = [
  { name: 'TechVision', handle: 'techvision', username: 'techvision', email: 'tech@viewtube.com', bio: 'Exploring the latest in technology and innovation.' },
  { name: 'MusicWaves', handle: 'musicwaves', username: 'musicwaves', email: 'music@viewtube.com', bio: 'Curated music content and live performances.' },
  { name: 'GamerZone', handle: 'gamerzone', username: 'gamerzone', email: 'gamer@viewtube.com', bio: 'Gaming reviews, walkthroughs, and esports coverage.' },
  { name: 'CookMaster', handle: 'cookmaster', username: 'cookmaster', email: 'cook@viewtube.com', bio: 'Delicious recipes from around the world.' },
  { name: 'FitLife', handle: 'fitlife', username: 'fitlife', email: 'fit@viewtube.com', bio: 'Workouts, nutrition tips, and healthy living.' },
  { name: 'ScienceNow', handle: 'sciencenow', username: 'sciencenow', email: 'science@viewtube.com', bio: 'Making science accessible and fun for everyone.' },
  { name: 'TravelVlog', handle: 'travelvlog', username: 'travelvlog', email: 'travel@viewtube.com', bio: 'Exploring destinations around the globe.' },
  { name: 'CodeNinja', handle: 'codeninja', username: 'codeninja', email: 'code@viewtube.com', bio: 'Programming tutorials and tech career advice.' },
]

const COLORS = [
  ['#1a1a2e', '#16213e', '#0f3460'],
  ['#2d1b69', '#11998e', '#38ef7d'],
  ['#ee0979', '#ff6a00'],
  ['#2c3e50', '#3498db'],
  ['#e74c3c', '#c0392b'],
  ['#1abc9c', '#16a085'],
  ['#f39c12', '#e67e22'],
  ['#8e44ad', '#3498db'],
  ['#27ae60', '#2ecc71'],
  ['#e74c3c', '#9b59b6'],
  ['#2c3e50', '#e74c3c'],
  ['#34495e', '#e67e22'],
  ['#1e3c72', '#2a5298'],
  ['#eb3349', '#f45c43'],
  ['#00b4db', '#0083b0'],
]

const CATEGORIES = ['Music', 'Gaming', 'Education', 'Entertainment', 'Sports', 'News', 'Technology', 'Comedy', 'Science', 'Travel', 'Cooking', 'Fitness', 'Nature', 'Art']

const VIDEO_TEMPLATES: Record<string, { titles: string[]; descriptions: string[]; tags: string[] }> = {
  techvision: {
    titles: [
      'Top 10 Gadgets of 2025 You Need to See',
      'iPhone 17 Pro Max - Complete Review',
      'Building a $5000 Gaming PC in 2025',
      'Why AI Will Change Everything This Year',
      'The Future of Electric Vehicles',
      'Best Budget Laptops for Students',
      'How Quantum Computers Actually Work',
      'Smart Home Setup Tour 2025',
      'MacBook Pro M5 - Should You Upgrade?',
      'The Truth About 6G Technology',
      'Robotics Revolution: What to Expect',
      'Unboxing the Latest Samsung Galaxy',
    ],
    descriptions: [
      'In this video, we explore the most exciting tech gadgets released this year. From smartphones to wearables, these are the devices you need to know about.',
      'A comprehensive review covering design, performance, battery life, camera quality, and value for money.',
      'Step-by-step guide to building the ultimate gaming PC with the latest components available in 2025.',
      'An in-depth look at how artificial intelligence is reshaping industries and what it means for the future.',
    ],
    tags: ['technology', 'gadgets', 'review', 'tech', '2025', 'AI', 'gaming', 'computers'],
  },
  musicwaves: {
    titles: [
      'Top 50 Songs of 2025 - Year End Mashup',
      'How to Produce Music Like a Pro',
      'Live Concert Performance - Full Show',
      'Piano Tutorial for Beginners - Easy Songs',
      'The Evolution of Pop Music',
      'Guitar Lesson: Play Any Song in 10 Minutes',
      'Behind the Scenes: Making an Album',
      'Best Music Production Software 2025',
      'Singing Tips from Professional Vocalists',
      'Acoustic Covers Playlist - Chill Vibes',
      'Drumming Techniques Every Player Should Know',
      'Music Theory Explained Simply',
    ],
    descriptions: [
      'A curated collection of the biggest hits this year, blended into one incredible mashup.',
      'Learn the fundamentals of music production from arrangement to mixing and mastering.',
      'An incredible live performance featuring original songs and fan favorites.',
    ],
    tags: ['music', 'tutorial', 'concert', 'piano', 'guitar', 'production', 'singing', 'covers'],
  },
  gamerzone: {
    titles: [
      'GTA 6 - Everything We Know So Far',
      'Elden Ring DLC - Full Walkthrough Part 1',
      'Best Indie Games You Missed in 2024',
      'PS6 vs Xbox Next - Console War 2025',
      'Speedrun World Record Attempt - Live',
      'Top 100 Games of All Time',
      'Minecraft Survival Series - Episode 1',
      'Valorant Champions Tour Highlights',
      'Retro Gaming Collection Showcase',
      'Game Design Analysis: What Makes Games Fun',
      'Multiplayer Gaming with Friends - Hilarious Moments',
      'The Complete Guide to Esports Careers',
    ],
    descriptions: [
      'All the confirmed details, rumors, and leaks about the most anticipated game of the decade.',
      'A complete walkthrough of the new DLC expansion with all boss fights and secret areas.',
      'Discover amazing indie games that flew under the radar but deserve your attention.',
    ],
    tags: ['gaming', 'gta', 'elden ring', 'indie', 'ps5', 'xbox', 'minecraft', 'esports'],
  },
  cookmaster: {
    titles: [
      'Perfect Homemade Pasta From Scratch',
      'Japanese Street Food Recipes You Can Make',
      'Baking Bread: Beginners Complete Guide',
      '50 Quick Dinner Ideas Under 30 Minutes',
      'The Secret to Restaurant-Quality Steaks',
      'Meal Prep Sunday - Full Week Plan',
      'Authentic Thai Curry Recipe',
      'Dessert Masters: 5 Showstopper Cakes',
      'Healthy Meal Ideas for Weight Loss',
      'Cooking Techniques Every Home Chef Needs',
      'International Breakfast Tour',
      'Vegan Recipes That Actually Taste Amazing',
    ],
    descriptions: [
      'Learn to make fresh pasta at home with just flour and eggs. Simple techniques for perfect results.',
      'Recreate popular Japanese street food in your own kitchen with these easy-to-follow recipes.',
      'Everything you need to know about baking bread, from ingredients to techniques.',
    ],
    tags: ['cooking', 'recipe', 'pasta', 'baking', 'healthy', 'dessert', 'meal prep', 'vegan'],
  },
  fitlife: {
    titles: [
      'Full Body Workout - No Equipment Needed',
      '30-Day Transformation Challenge',
      'Nutrition Facts Everyone Gets Wrong',
      'Yoga for Complete Beginners - 20 Minutes',
      'How to Build Muscle After 40',
      'HIIT Workout: Burn 500 Calories in 30 Min',
      'Protein Guide: How Much Do You Really Need?',
      'Stretching Routine for Better Flexibility',
      'Running Tips for Marathon Beginners',
      'Home Gym Setup Under $500',
      'Mental Health and Exercise Connection',
      'Recovery Day: Active Rest Workout',
    ],
    descriptions: [
      'A complete full body workout you can do anywhere with zero equipment. Perfect for all fitness levels.',
      'Follow along with this 30-day challenge to transform your body and build healthy habits.',
      'Debunking common nutrition myths and learning what science actually says about healthy eating.',
    ],
    tags: ['fitness', 'workout', 'yoga', 'nutrition', 'muscle', 'HIIT', 'running', 'health'],
  },
  sciencenow: {
    titles: [
      'What Happens Inside a Black Hole?',
      'Climate Change: The Real Numbers',
      'Quantum Physics Explained Simply',
      'The Search for Extraterrestrial Life',
      'How Your Brain Actually Works',
      'DNA Editing with CRISPR - The Future',
      'Space Exploration 2025: Missions Ahead',
      'The Chemistry of Everyday Life',
      'Evolution: Evidence You Can See',
      'Artificial Intelligence vs Human Intelligence',
      'Deep Ocean Mysteries We Still Cannot Explain',
      'The Physics of Time Travel',
    ],
    descriptions: [
      'Exploring the most extreme objects in the universe and what physics tells us about them.',
      'A data-driven look at climate change with the latest research and what we can do about it.',
      'Breaking down complex quantum concepts into simple, understandable explanations.',
    ],
    tags: ['science', 'physics', 'space', 'biology', 'chemistry', 'AI', 'climate', 'research'],
  },
  travelvlog: {
    titles: [
      'Japan Travel Guide - 14 Days Itinerary',
      'Budget Travel: Europe for $50 a Day',
      'Hidden Gems of Southeast Asia',
      'Road Trip Across America - Full Documentary',
      'Best Islands to Visit in 2025',
      'Solo Female Travel Safety Tips',
      'Luxury Hotels You Need to Experience',
      'Street Food Tour - Bangkok Thailand',
      'Backpacking South America - 3 Months',
      'Photography Tips for Travelers',
      'Cultural Experiences Around the World',
      'How to Plan the Perfect Vacation',
    ],
    descriptions: [
      'The ultimate 14-day Japan itinerary covering Tokyo, Kyoto, Osaka, and more hidden spots.',
      'Proven tips and tricks to travel through Europe without breaking the bank.',
      'Off the beaten path destinations that most tourists never find.',
    ],
    tags: ['travel', 'japan', 'europe', 'budget', 'adventure', 'food', 'photography', 'guide'],
  },
  codeninja: {
    titles: [
      'Learn Python in 1 Hour - Full Tutorial',
      'React vs Vue vs Angular in 2025',
      'Build a Full Stack App From Scratch',
      'Data Structures and Algorithms Explained',
      'Machine Learning for Beginners',
      'Web Development Roadmap 2025',
      'JavaScript Tips Nobody Tells You',
      'How to Ace Your Coding Interview',
      'Docker and Kubernetes Simplified',
      'API Design Best Practices',
      'TypeScript Advanced Patterns',
      'Freelance Developer: Complete Guide',
    ],
    descriptions: [
      'A comprehensive Python tutorial covering everything from basics to advanced concepts in just one hour.',
      'An honest comparison of the three most popular frontend frameworks with pros and cons.',
      'Step-by-step guide to building a complete web application from frontend to backend.',
    ],
    tags: ['programming', 'python', 'javascript', 'react', 'web development', 'tutorial', 'coding'],
  },
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomPicks<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function generateSvgThumbnail(title: string, channelName: string, index: number): string {
  const colorPair = COLORS[index % COLORS.length]
  const c1 = colorPair[0]
  const c2 = colorPair[1] || colorPair[0]
  const c3 = colorPair[2] || c2

  const truncatedTitle = title.length > 40 ? title.substring(0, 37) + '...' : title
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs>
    <linearGradient id="g${index}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/>
      <stop offset="100%" style="stop-color:${c2}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#g${index})"/>
  <circle cx="320" cy="140" r="50" fill="${c3}" opacity="0.3"/>
  <polygon points="305,115 345,140 305,165" fill="white" opacity="0.9"/>
  <text x="320" y="230" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="white" text-anchor="middle">${truncatedTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>
  <text x="320" y="265" font-family="system-ui,sans-serif" font-size="14" fill="rgba(255,255,255,0.7)" text-anchor="middle">${channelName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>
</svg>`

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

function generateAvatarSvg(name: string, index: number): string {
  const colorPair = COLORS[index % COLORS.length]
  const c1 = colorPair[0]
  const initial = name[0].toUpperCase()

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="50" fill="${c1}"/>
  <text x="50" y="62" font-family="system-ui,sans-serif" font-size="40" font-weight="700" fill="white" text-anchor="middle">${initial}</text>
</svg>`

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

async function main() {
  console.log('Seeding database...')

  await db.profile.deleteMany({})

  const channelIds: string[] = []
  const videoCount = 12

  for (let i = 0; i < CHANNELS.length; i++) {
    const ch = CHANNELS[i]
    const userId = crypto.randomUUID()

    const profile = await db.profile.create({
      data: {
        userId,
        name: ch.name,
        username: ch.username,
        email: ch.email,
        avatarUrl: generateAvatarSvg(ch.name, i),
        bio: ch.bio,
      },
    })

    const channel = await db.channel.create({
      data: {
        profileId: profile.id,
        name: ch.name,
        handle: ch.handle,
        avatarUrl: generateAvatarSvg(ch.name, i),
        subscriberCount: randomInt(100, 500000),
        videoCount,
      },
    })

    channelIds.push(channel.id)

    const templates = VIDEO_TEMPLATES[ch.handle]
    if (!templates) continue

    for (let j = 0; j < videoCount; j++) {
      const title = templates.titles[j] || `${ch.name} Video ${j + 1}`
      const description = templates.descriptions[j % templates.descriptions.length]
      const category = CATEGORIES[randomInt(0, CATEGORIES.length - 1)]
      const tags = randomPicks(templates.tags, randomInt(2, 5))
      const daysAgo = randomInt(0, 365)
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      const duration = randomInt(120, 2400)

      await db.video.create({
        data: {
          channelId: channel.id,
          title,
          description,
          thumbnailUrl: generateSvgThumbnail(title, ch.name, i * 100 + j),
          videoUrl: '/uploads/videos/placeholder.mp4',
          duration,
          category,
          tags: JSON.stringify(tags),
          viewCount: randomInt(100, 2000000),
          likeCount: randomInt(50, 100000),
          dislikeCount: randomInt(0, 2000),
          commentCount: randomInt(0, 500),
          isPublic: true,
          createdAt,
          updatedAt: createdAt,
        },
      })
    }

    console.log(`  Created ${ch.name} with ${videoCount} videos`)
  }

  for (const channelId of channelIds) {
    const count = await db.video.count({ where: { channelId } })
    await db.channel.update({
      where: { id: channelId },
      data: { videoCount: count },
    })
  }

  const totalVideos = await db.video.count()
  const totalChannels = await db.channel.count()
  console.log(`\nDone! Created ${totalChannels} channels with ${totalVideos} videos total.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })