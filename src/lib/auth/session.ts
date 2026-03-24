import { getServerSession } from 'next-auth'
import { authOptions } from './config'
import { UserSession } from '@/types/user'

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function getUserSession(): Promise<UserSession | null> {
  const session = await getSession()
  
  if (!session?.user) {
    return null
  }

  return {
    id: session.user.id,
    username: session.user.username,
  }
}

export async function requireAuth(): Promise<UserSession> {
  const user = await getUserSession()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}
