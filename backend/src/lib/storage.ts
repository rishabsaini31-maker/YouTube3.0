import { supabase } from './supabase'
import fs from 'node:fs/promises'
import path from 'node:path'

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'Mp4'

export async function saveFile(
  buffer: Buffer,
  subfolder: 'videos' | 'thumbnails' | 'avatars' | 'banners',
  mimeType: string
): Promise<string> {
  const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
  const ext = getExtension(mimeType)
  const filePath = `${subfolder}/${uniqueId}.${ext}`

  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: mimeType || 'application/octet-stream',
        upsert: true,
      })

    if (error) {
      throw error
    }

    const { data } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath)

    return data.publicUrl
  } catch (error) {
    console.error('Supabase upload failed! Full error details:', JSON.stringify(error, null, 2))
    throw error
  }
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogg',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return map[mimeType] || 'bin'
}

export async function deleteFile(fileUrl: string): Promise<void> {
  if (!fileUrl) return

  try {
    const url = new URL(fileUrl)
    const pathParts = url.pathname.split(`/storage/v1/object/public/${BUCKET}/`)
    if (pathParts.length >= 2) {
      const filePath = pathParts[1]
      const { error } = await supabase.storage
        .from(BUCKET)
        .remove([filePath])

      if (error) {
        console.error('Failed to delete file from storage:', error)
      }
      return
    }

    const localPath = path.join(process.cwd(), 'public', fileUrl)
    await fs.unlink(localPath)
  } catch {
    // Invalid URL, ignore
  }
}
