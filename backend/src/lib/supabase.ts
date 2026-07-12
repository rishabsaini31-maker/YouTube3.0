import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import https from 'node:https'

dotenv.config()

if (process.env.NODE_ENV !== 'production') {
  https.globalAgent.options.rejectUnauthorized = false
}

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
)
