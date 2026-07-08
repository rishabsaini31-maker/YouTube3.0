import fs from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

export async function saveFile(
  file: File,
  subfolder: 'videos' | 'thumbnails' | 'avatars' | 'banners',
  filename?: string
): Promise<string> {
  const dir = path.join(UPLOAD_DIR, subfolder)
  await fs.mkdir(dir, { recursive: true })

  const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
  const ext = file.name.split('.').pop() || 'bin'
  const finalName = filename ? `${filename}-${uniqueId}.${ext}` : `${uniqueId}.${ext}`
  const filePath = path.join(dir, finalName)

  const bytes = await file.arrayBuffer()
  await fs.writeFile(filePath, Buffer.from(bytes))

  return `/uploads/${subfolder}/${finalName}`
}

export async function deleteFile(fileUrl: string): Promise<void> {
  if (!fileUrl || !fileUrl.startsWith('/uploads/')) return

  const filePath = path.join(process.cwd(), 'public', fileUrl)
  try {
    await fs.unlink(filePath)
  } catch {
    // File may not exist, ignore
  }
}