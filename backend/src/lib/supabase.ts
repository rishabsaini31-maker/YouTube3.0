import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import https from 'node:https'
import fetch from 'node-fetch'

dotenv.config()

// Create a custom HTTPS agent that explicitly forces IPv4 (family: 4)
// and bypasses SSL certificate errors if any.
const agent = new https.Agent({
  family: 4,
  rejectUnauthorized: process.env.NODE_ENV === 'production',
})

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!,
  {
    global: {
      fetch: (url, options) => {
        return fetch(url, { ...options, agent } as any)
      },
    },
  }
)
