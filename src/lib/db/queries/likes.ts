import ArangoDBClient from '../arango'
import { COLLECTIONS } from '../collections'
import { Like } from '@/types/likes'

export class LikeQueries {
  static async likeWorld(userId: string, worldId: string): Promise<Like> {
    const db = ArangoDBClient.getClient()
    const collection = db.collection(COLLECTIONS.LIKES)
    
    const likeKey = `like_${userId}_${worldId}`
    const like: Like = {
      _key: likeKey,
      userId,
      worldId,
      createdAt: new Date().toISOString(),
    }
    
    await collection.save(like)
    return like
  }

  static async unlikeWorld(userId: string, worldId: string): Promise<void> {
    const db = ArangoDBClient.getClient()
    const collection = db.collection(COLLECTIONS.LIKES)
    
    const likeKey = `like_${userId}_${worldId}`
    
    try {
      await collection.remove(likeKey)
    } catch {
      // Like doesn't exist, ignore
    }
  }

  static async hasUserLikedWorld(userId: string, worldId: string): Promise<boolean> {
    const db = ArangoDBClient.getClient()
    
    const cursor = await db.query(`
      FOR like IN ${COLLECTIONS.LIKES}
        FILTER like.userId == @userId AND like.worldId == @worldId
        LIMIT 1
        RETURN like
    `, { userId, worldId })
    
    const results = await cursor.all()
    return results.length > 0
  }

  static async getUserLikes(userId: string): Promise<string[]> {
    const db = ArangoDBClient.getClient()
    
    const cursor = await db.query(`
      FOR like IN ${COLLECTIONS.LIKES}
        FILTER like.userId == @userId
        RETURN like.worldId
    `, { userId })
    
    return await cursor.all()
  }

  static async getWorldLikeCount(worldId: string): Promise<number> {
    const db = ArangoDBClient.getClient()
    
    const cursor = await db.query(`
      RETURN COUNT(
        FOR like IN ${COLLECTIONS.LIKES}
          FILTER like.worldId == @worldId
          RETURN 1
      )
    `, { worldId })
    
    const results = await cursor.all()
    return results[0] || 0
  }
}
