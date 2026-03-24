import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'
import ArangoDBClient from './arango'
import { COLLECTIONS } from './collections'
import { UNIVERSE_ID } from '../constants'
import { BlockCatalog } from '@/types/block'

// Load .env.local file
config({ path: path.resolve(process.cwd(), '.env.local') })

async function seedBlockCatalog() {
  console.log('🌱 Seeding Block Catalog...')
  
  const db = ArangoDBClient.getClient()
  const collection = db.collection(COLLECTIONS.BLOCK_CATALOG)

  try {
    // Check if already seeded
    const cursor = await db.query(`
      FOR block IN ${COLLECTIONS.BLOCK_CATALOG}
        LIMIT 1
        RETURN block
    `)
    const existing = await cursor.all()
    
    if (existing.length > 0) {
      console.log('⚠️  Block catalog already seeded. Skipping...')
      process.exit(0)
    }

    // Read tile files from univers/ink_castle/tiles
    const tilesDir = path.join(process.cwd(), 'univers', UNIVERSE_ID, 'tiles')
    
    if (!fs.existsSync(tilesDir)) {
      console.error(`❌ Tiles directory not found: ${tilesDir}`)
      process.exit(1)
    }

    const files = fs.readdirSync(tilesDir)
    const tileFiles = files.filter(f => f.startsWith('tile_') && f.endsWith('.png'))

    console.log(`📦 Found ${tileFiles.length} tile files`)

    const blocks: BlockCatalog[] = []

    for (const file of tileFiles) {
      // Parse filename: tile_{id}_{layer}_{rarity}.png
      const match = file.match(/^tile_(\d+)_(\d+)_(\d+)\.png$/)
      
      if (!match) {
        console.warn(`⚠️  Skipping invalid filename: ${file}`)
        continue
      }

      const [, id, layer, rarity] = match
      const blockKey = `block_${id}_${layer}_${rarity}`

      blocks.push({
        _key: blockKey,
        blockId: id,
        layer: parseInt(layer, 10),
        rarity: parseInt(rarity, 10),
        universeId: UNIVERSE_ID,
        imagePath: `/univers/${UNIVERSE_ID}/tiles/${file}`,
      })
    }

    // Insert all blocks
    if (blocks.length > 0) {
      await collection.saveAll(blocks)
      console.log(`✅ Seeded ${blocks.length} blocks into catalog`)
      
      // Display summary
      const layerCounts = blocks.reduce((acc, b) => {
        acc[b.layer] = (acc[b.layer] || 0) + 1
        return acc
      }, {} as Record<number, number>)
      
      const rarityCounts = blocks.reduce((acc, b) => {
        acc[b.rarity] = (acc[b.rarity] || 0) + 1
        return acc
      }, {} as Record<number, number>)

      console.log('📊 Layer distribution:', layerCounts)
      console.log('📊 Rarity distribution:', rarityCounts)
    } else {
      console.log('⚠️  No valid blocks found to seed')
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seedBlockCatalog()
