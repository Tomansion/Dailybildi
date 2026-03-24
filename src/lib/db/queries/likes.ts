import prisma from '../prisma'
import { Like } from '@/types/likes'

export class LikeQueries {
  static async likeWorld(userId: string, worldId: string): Promise<Like> {
    const like = await prisma.like.create({
      data: {
        userId,
        worldId,
      },
    })
    
    return {
      _key: like.id,
      userId: like.userId,
      worldId: like.worldId,
      createdAt: like.createdAt.toISOString(),
    }
  }

  static async unlikeWorld(userId: string, worldId: string): Promise<void> {
    await prisma.like.deleteMany({
      where: {
        userId,
        worldId,
      },
    })
  }

  static async hasUserLikedWorld(userId: string, worldId: string): Promise<boolean> {
    const like = await prisma.like.findUnique({
      where: {
        userId_worldId: {
          userId,
          worldId,
        },
      },
    })
    
    return like !== null
  }

  static async getUserLikes(userId: string): Promise<string[]> {
    const likes = await prisma.like.findMany({
      where: { userId },
      select: { worldId: true },
    })
    
    return likes.map(l => l.worldId)
  }

  static async getWorldLikeCount(worldId: string): Promise<number> {
    return await prisma.like.count({
      where: { worldId },
    })
  }
}
