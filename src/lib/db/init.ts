import { config } from 'dotenv'
import { Database } from 'arangojs'
import ArangoDBClient from './arango'
import { COLLECTIONS } from './collections'
import path from 'path'

// Load .env.local file
config({ path: path.resolve(process.cwd(), '.env.local') })

async function initializeDatabase() {
  console.log('🔧 Initializing DailyBildi database...')
  
  try {
    // Connect to _system database to create the target database
    const systemDb = new Database({
      url: process.env.ARANGO_URL || 'http://localhost:8529',
      databaseName: '_system',
      auth: {
        username: process.env.ARANGO_USERNAME || 'root',
        password: process.env.ARANGO_PASSWORD || '',
      },
    })
    
    const databases = await systemDb.listDatabases()
    const dbName = process.env.ARANGO_DATABASE || 'dailybildi'
    
    if (!databases.includes(dbName)) {
      console.log(`📦 Creating database: ${dbName}`)
      await systemDb.createDatabase(dbName)
    } else {
      console.log(`✓ Database exists: ${dbName}`)
    }

    // Now connect to the target database
    const db = ArangoDBClient.getClient()

    // Create collections
    const collections = Object.values(COLLECTIONS)
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName)
      const exists = await collection.exists()
      
      if (!exists) {
        console.log(`📁 Creating collection: ${collectionName}`)
        await collection.create()
      } else {
        console.log(`✓ Collection exists: ${collectionName}`)
      }
    }

    // Create indexes
    console.log('🔍 Creating indexes...')
    
    // Users indexes
    const usersCollection = db.collection(COLLECTIONS.USERS)
    await usersCollection.ensureIndex({
      type: 'persistent',
      fields: ['username'],
      unique: true,
      name: 'idx_username',
    })

    // DailyBlockSelections indexes
    const dailyBlocksCollection = db.collection(COLLECTIONS.DAILY_BLOCK_SELECTIONS)
    await dailyBlocksCollection.ensureIndex({
      type: 'persistent',
      fields: ['date'],
      unique: true,
      name: 'idx_date',
    })

    // UserInventories indexes
    const inventoriesCollection = db.collection(COLLECTIONS.USER_INVENTORIES)
    await inventoriesCollection.ensureIndex({
      type: 'persistent',
      fields: ['userId'],
      unique: true,
      name: 'idx_userId',
    })

    // Worlds indexes
    const worldsCollection = db.collection(COLLECTIONS.WORLDS)
    await worldsCollection.ensureIndex({
      type: 'persistent',
      fields: ['userId'],
      name: 'idx_worlds_userId',
    })
    await worldsCollection.ensureIndex({
      type: 'persistent',
      fields: ['updatedAt'],
      name: 'idx_updatedAt',
    })
    await worldsCollection.ensureIndex({
      type: 'persistent',
      fields: ['likeCount'],
      name: 'idx_likeCount',
    })

    // PlacedBlocks indexes
    const placedBlocksCollection = db.collection(COLLECTIONS.PLACED_BLOCKS)
    await placedBlocksCollection.ensureIndex({
      type: 'persistent',
      fields: ['worldId'],
      name: 'idx_worldId',
    })

    // Likes indexes
    const likesCollection = db.collection(COLLECTIONS.LIKES)
    await likesCollection.ensureIndex({
      type: 'persistent',
      fields: ['userId', 'worldId'],
      unique: true,
      name: 'idx_userId_worldId',
    })
    await likesCollection.ensureIndex({
      type: 'persistent',
      fields: ['worldId'],
      name: 'idx_likes_worldId',
    })

    console.log('✅ Database initialization complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
}

initializeDatabase()
