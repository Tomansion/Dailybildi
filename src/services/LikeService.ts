import { LikeQueries } from '@/lib/db/queries/likes'
import { WorldQueries } from '@/lib/db/queries/worlds'

export class LikeService {
  static async likeWorld(userId: string, worldId: string): Promise<void> {
    // Check if already liked
    const hasLiked = await LikeQueries.hasUserLikedWorld(userId, worldId)
    if (hasLiked) {
      return
    }

    // Create like
    await LikeQueries.likeWorld(userId, worldId)

    // Increment like count
    await WorldQueries.incrementLikeCount(worldId)
  }

  static async unlikeWorld(userId: string, worldId: string): Promise<void> {
    // Check if liked
    const hasLiked = await LikeQueries.hasUserLikedWorld(userId, worldId)
    if (!hasLiked) {
      return
    }

    // Remove like
    await LikeQueries.unlikeWorld(userId, worldId)

    // Decrement like count
    await WorldQueries.decrementLikeCount(worldId)
  }

  static async hasUserLikedWorld(userId: string, worldId: string): Promise<boolean> {
    return LikeQueries.hasUserLikedWorld(userId, worldId)
  }

  static async getUserLikedWorlds(userId: string): Promise<string[]> {
    return LikeQueries.getUserLikes(userId)
  }
}
