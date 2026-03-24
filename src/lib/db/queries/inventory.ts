import prisma from '../prisma'
import { UserInventory, InventoryBlock, InventoryBlockWithData } from '@/types/inventory'

export class InventoryQueries {
  static async createInventory(userId: string): Promise<UserInventory> {
    const inventory = await prisma.userInventory.create({
      data: {
        userId,
      },
    })
    
    return {
      _key: inventory.id,
      userId: inventory.userId,
      blocks: [],
      updatedAt: inventory.updatedAt.toISOString(),
    }
  }

  static async getInventory(userId: string): Promise<UserInventory | null> {
    const inventory = await prisma.userInventory.findUnique({
      where: { userId },
      include: {
        blocks: {
          include: {
            blockCatalog: true,
          },
        },
      },
    })
    
    if (!inventory) return null
    
    return {
      _key: inventory.id,
      userId: inventory.userId,
      blocks: inventory.blocks.map(b => ({
        blockCatalogKey: b.blockCatalogId,
        quantity: b.quantity,
        acquiredDate: b.acquiredDate.toISOString(),
      })),
      updatedAt: inventory.updatedAt.toISOString(),
    }
  }

  static async getInventoryWithBlockData(userId: string): Promise<InventoryBlockWithData[]> {
    const inventory = await prisma.userInventory.findUnique({
      where: { userId },
      include: {
        blocks: {
          include: {
            blockCatalog: true,
          },
        },
      },
    })
    
    if (!inventory) return []
    
    return inventory.blocks.map(invBlock => ({
      blockCatalogKey: invBlock.blockCatalogId,
      quantity: invBlock.quantity,
      acquiredDate: invBlock.acquiredDate.toISOString(),
      blockData: {
        id: invBlock.blockCatalog.blockId,
        layer: invBlock.blockCatalog.layer,
        rarity: invBlock.blockCatalog.rarity,
        imagePath: invBlock.blockCatalog.imagePath,
      },
    }))
  }

  static async addBlocks(userId: string, blocks: InventoryBlock[]): Promise<void> {
    const inventory = await prisma.userInventory.findUnique({
      where: { userId },
    })
    
    if (!inventory) {
      throw new Error('Inventory not found')
    }

    for (const newBlock of blocks) {
      // Try to find existing inventory block
      const existingBlock = await prisma.inventoryBlock.findUnique({
        where: {
          inventoryId_blockCatalogId: {
            inventoryId: inventory.id,
            blockCatalogId: newBlock.blockCatalogKey,
          },
        },
      })

      if (existingBlock) {
        // Update quantity
        await prisma.inventoryBlock.update({
          where: { id: existingBlock.id },
          data: {
            quantity: existingBlock.quantity + newBlock.quantity,
          },
        })
      } else {
        // Create new inventory block
        await prisma.inventoryBlock.create({
          data: {
            inventoryId: inventory.id,
            blockCatalogId: newBlock.blockCatalogKey,
            quantity: newBlock.quantity,
            acquiredDate: new Date(newBlock.acquiredDate),
          },
        })
      }
    }
  }

  static async removeBlock(userId: string, blockCatalogKey: string, quantity: number = 1): Promise<void> {
    const inventory = await prisma.userInventory.findUnique({
      where: { userId },
    })
    
    if (!inventory) {
      throw new Error('Inventory not found')
    }

    const inventoryBlock = await prisma.inventoryBlock.findUnique({
      where: {
        inventoryId_blockCatalogId: {
          inventoryId: inventory.id,
          blockCatalogId: blockCatalogKey,
        },
      },
    })

    if (!inventoryBlock) return

    const newQuantity = inventoryBlock.quantity - quantity

    if (newQuantity <= 0) {
      // Remove the block completely
      await prisma.inventoryBlock.delete({
        where: { id: inventoryBlock.id },
      })
    } else {
      // Update quantity
      await prisma.inventoryBlock.update({
        where: { id: inventoryBlock.id },
        data: { quantity: newQuantity },
      })
    }
  }

  static async clearInventory(userId: string): Promise<void> {
    const inventory = await prisma.userInventory.findUnique({
      where: { userId },
    })
    
    if (!inventory) return

    await prisma.inventoryBlock.deleteMany({
      where: { inventoryId: inventory.id },
    })
  }
}
