import { Request, Response, NextFunction } from 'express'
import { jwtDecrypt } from 'jose'
import crypto from 'crypto'

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.headers['x-user-id'] as string | undefined
    if (userId) {
      (req as any).user = { id: userId }
      return next()
    }

    const rawSecret = process.env.NEXTAUTH_SECRET || 'viewtube-dev-secret-change-in-production'
    const secret = crypto.createHash('sha256').update(rawSecret).digest()
    
    const cookies = req.headers.cookie || ''
    
    const tokenMatch = cookies.match(/next-auth\.session-token=([^;]+)/)
    if (!tokenMatch) {
      return next()
    }

    const encryptedToken = tokenMatch[1]

    try {
      const decoded = await jwtDecrypt(encryptedToken, secret)
      const payload = decoded.payload as any

      if (payload.sub) {
        (req as any).user = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          profileId: payload.profileId,
          username: payload.username,
          avatarUrl: payload.avatarUrl,
          channelId: payload.channelId,
          channelHandle: payload.channelHandle,
        }
      }
    } catch (decryptError) {
      console.error('[Auth] Token decrypt error:', decryptError)
    }

    next()
  } catch (error) {
    console.error('[Auth] Middleware error:', error)
    next()
  }
}
