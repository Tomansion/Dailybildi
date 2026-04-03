<template>
  <div class="world-view-container">
    <button @click="goBack" class="back-btn">← Back to Community</button>

    <div v-if="loading" class="loading">Loading world...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="!world" class="error">World not found</div>

    <div v-else class="world-detail">
      <div class="world-canvas-container">
        <div id="phaser-container-view" class="phaser-container"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getTileImageUrl } from '../services/urls'
import { PhaserGameWrapper } from '../phaser/PhaserGame'
import api from '../services/api'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const world = ref(null)
const loading = ref(false)
const error = ref(null)
const isLiked = ref(false)

let phaserGame = null
let mainScene = null

const goBack = () => {
  router.back()
}

const fetchWorld = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await api.get(`/world/${route.params.worldId}`)
    world.value = response.data

    // Check if user has liked this world
    if (authStore.isAuthenticated) {
      const likesResponse = await api.get('/likes')
      isLiked.value = likesResponse.data.liked_world_ids.includes(route.params.worldId)
    }

    // Initialize Phaser after world data is loaded
    initializePhaserGame()
  } catch (err) {
    error.value = 'Failed to load world'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const initializePhaserGame = () => {
  if (!world.value) return

  // Initialize Phaser game
  phaserGame = new PhaserGameWrapper()
  phaserGame.initialize('phaser-container-view')

  // Wait for scene to be ready
  const checkScene = setInterval(() => {
    mainScene = phaserGame.getMainScene()
    if (mainScene) {
      clearInterval(checkScene)

      // Set read-only mode - disables block manipulation
      mainScene.setReadOnly(true)

      // Collect all block images to load from placed blocks
      const blockImageMap = new Map()
      
      world.value.placed_blocks.forEach(block => {
        if (!blockImageMap.has(block.block_catalog_id)) {
          blockImageMap.set(block.block_catalog_id, {
            id: block.block_catalog_id,
            layer: block.layer,
            rarity: block.rarity,
            imagePath: getTileImageUrl(block.image_path)
          })
        }
      })
      
      const allBlockImages = Array.from(blockImageMap.values())

      // Transform placed blocks to Phaser format
      const placedBlocks = world.value.placed_blocks.map(block => ({
        _key: block.id,
        blockKey: block.id,
        blockCatalogKey: block.block_id,
        gridX: block.grid_x,
        gridY: block.grid_y,
        rotation: block.rotation || 0,
        flipX: block.flip_x || false,
        flipY: block.flip_y || false,
        zOrder: block.z_order || 0,
        blockData: {
          id: block.block_catalog_id,
          layer: block.layer,
          rarity: block.rarity,
          imagePath: getTileImageUrl(block.image_path)
        }
      }))

      // Load images first, then blocks
      if (allBlockImages.length > 0) {
        mainScene.loadBlockImages(allBlockImages, () => {
          mainScene.loadBlocks(placedBlocks)
        })
      } else {
        mainScene.loadBlocks(placedBlocks)
      }
    }
  }, 100)

  // Timeout after 10 seconds
  setTimeout(() => {
    clearInterval(checkScene)
    if (!mainScene) {
      error.value = 'Failed to initialize game'
    }
  }, 10000)
}

const toggleLike = async () => {
  try {
    if (isLiked.value) {
      await api.delete(`/likes/${route.params.worldId}`)
      world.value.like_count -= 1
    } else {
      await api.post(`/likes/${route.params.worldId}`)
      world.value.like_count += 1
    }
    isLiked.value = !isLiked.value
  } catch (err) {
    error.value = 'Failed to update like'
    console.error(err)
  }
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

onMounted(() => {
  fetchWorld()
})

onBeforeUnmount(() => {
  if (phaserGame) {
    phaserGame.destroy()
    phaserGame = null
    mainScene = null
  }
})
</script>

<style scoped>
.world-view-container {
  max-width: 100%;
  margin: 0 auto;
  padding: 1rem;
}

.back-btn {
  margin-bottom: 2rem;
  background-color: var(--surface);
  color: var(--text-primary);
  border: 1px solid var(--border);
  padding: 0.5rem 1rem;
}

.back-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.world-detail {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.world-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.world-header h1 {
  margin: 0;
  color: var(--text-primary);
  flex: 1;
}

.world-actions {
  display: flex;
  gap: 1rem;
}

.like-btn {
  font-size: 1.25rem;
  padding: 0.5rem 1rem;
  background-color: var(--surface);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
}

.like-btn:hover {
  border-color: var(--danger);
  color: var(--danger);
}

.like-btn.liked {
  border-color: var(--danger);
  color: var(--danger);
  background-color: rgba(239, 68, 68, 0.1);
}

.phaser-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.world-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.info-card {
  padding: 1.5rem;
}

.info-card h3,
.blocks-info h3 {
  margin-top: 0;
  color: var(--text-primary);
}

.info-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.info-card li {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border);
  color: var(--text-secondary);
}

.info-card li:last-child {
  border-bottom: none;
}

.label {
  font-weight: 500;
  color: var(--text-primary);
}

.blocks-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.block-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background-color: var(--background);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.block-name {
  font-weight: 500;
}

.block-position {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.loading,
.error {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.error {
  color: var(--danger);
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--danger);
  border-radius: 0.5rem;
}
</style>
