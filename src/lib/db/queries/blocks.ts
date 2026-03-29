import prisma from '../prisma'
import { BlockCatalog, DailyBlockSelection } from '@/types/block'

export class BlockQueries {
  static async getAllBlocks(): Promise<BlockCatalog[]> {
    const blocks = await prisma.blockCatalog.findMany({
      orderBy: [
        { layer: 'asc' },
        { rarity: 'asc' },
      ],
    })
    
    return blocks.map(block => ({
      _key: block.id,
      blockId: block.blockId,
      layer: block.layer,
      rarity: block.rarity,
      universeId: block.universeId,
      imagePath: block.imagePath,
    }))
  }

  static async getBlocksByKeys(blockKeys: string[]): Promise<BlockCatalog[]> {
    const blocks = await prisma.blockCatalog.findMany({
      where: {
        id: { in: blockKeys },
      },
    })
    
    return blocks.map(block => ({
      _key: block.id,
      blockId: block.blockId,
      layer: block.layer,
      rarity: block.rarity,
      universeId: block.universeId,
      imagePath: block.imagePath,
    }))
  }

  static async getBlockByKey(blockKey: string): Promise<BlockCatalog | null> {
    const block = await prisma.blockCatalog.findUnique({
      where: { id: blockKey },
    })
    
    if (!block) return null
    
    return {
      _key: block.id,
      blockId: block.blockId,
      layer: block.layer,
      rarity: block.rarity,
      universeId: block.universeId,
      imagePath: block.imagePath,
    }
  }

  static async saveDailySelection(date: string, selectedBlocks: string[]): Promise<void> {
    await prisma.dailyBlockSelection.create({
      data: {
        date,
        selectedBlocks: {
          connect: selectedBlocks.map(id => ({ id })),
        },
      },
    })
  }

  static async getDailySelection(date: string): Promise<DailyBlockSelection | null> {
    const selection = await prisma.dailyBlockSelection.findUnique({
      where: { date },
      include: {
        selectedBlocks: true,
      },
    })
    
    if (!selection) return null
    
    return {
      _key: selection.id,
      date: selection.date,
      selectedBlocks: selection.selectedBlocks.map(b => b.id),
      createdAt: selection.createdAt.toISOString(),
    }
  }

  static async getLatestDailySelection(): Promise<DailyBlockSelection | null> {
    const selection = await prisma.dailyBlockSelection.findFirst({
      orderBy: { date: 'desc' },
      include: {
        selectedBlocks: true,
      },
    })
    
    if (!selection) return null
    
    return {
      _key: selection.id,
      date: selection.date,
      selectedBlocks: selection.selectedBlocks.map(b => b.id),
      createdAt: selection.createdAt.toISOString(),
    }
  }

  static async resetDailySelection(date: string): Promise<void> {
    await prisma.dailyBlockSelection.delete({
      where: { date },
    }).catch(() => {
      // Silently ignore if not found
    })
  }
}
