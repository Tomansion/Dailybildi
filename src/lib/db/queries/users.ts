import ArangoDBClient from '../arango'
import { COLLECTIONS } from '../collections'
import { User } from '@/types/user'

export class UserQueries {
  static async createUser(userData: Omit<User, '_key'>): Promise<User> {
    const db = ArangoDBClient.getClient()
    const collection = db.collection(COLLECTIONS.USERS)
    
    const result = await collection.save(userData)
    return {
      _key: result._key,
      ...userData,
    }
  }

  static async findByUsername(username: string): Promise<User | null> {
    const db = ArangoDBClient.getClient()
    
    const cursor = await db.query(`
      FOR user IN ${COLLECTIONS.USERS}
        FILTER user.username == @username
        LIMIT 1
        RETURN user
    `, { username })
    
    const results = await cursor.all()
    return results[0] || null
  }

  static async findByEmail(email: string): Promise<User | null> {
    const db = ArangoDBClient.getClient()
    
    const cursor = await db.query(`
      FOR user IN ${COLLECTIONS.USERS}
        FILTER user.email == @email
        LIMIT 1
        RETURN user
    `, { email })
    
    const results = await cursor.all()
    return results[0] || null
  }

  static async findById(userId: string): Promise<User | null> {
    const db = ArangoDBClient.getClient()
    const collection = db.collection(COLLECTIONS.USERS)
    
    try {
      const user = await collection.document(userId)
      return user as User
    } catch {
      return null
    }
  }

  static async updateFirstLogin(userId: string, firstLoginAt: string): Promise<void> {
    const db = ArangoDBClient.getClient()
    const collection = db.collection(COLLECTIONS.USERS)
    
    await collection.update(userId, { firstLoginAt })
  }

  static async markInitialBlocksReceived(userId: string): Promise<void> {
    const db = ArangoDBClient.getClient()
    const collection = db.collection(COLLECTIONS.USERS)
    
    await collection.update(userId, { receivedInitialBlocks: true })
  }
}
