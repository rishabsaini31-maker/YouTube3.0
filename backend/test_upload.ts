import { saveFile } from './src/lib/storage'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  console.log('SUPABASE URL:', process.env.SUPABASE_URL)
  console.log('SUPABASE SERVICE KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not Set')
  console.log('SUPABASE ANON KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not Set')
  
  const dummyBuffer = Buffer.from('test data video file mock')
  try {
    const url = await saveFile(dummyBuffer, 'videos', 'video/mp4')
    console.log('Upload Result URL:', url)
  } catch (err) {
    console.error('Test script caught error:', err)
  }
}

main()
