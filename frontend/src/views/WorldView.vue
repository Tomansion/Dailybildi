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
  padding: 0 1rem;
}

.back-btn {
  margin-bottom: 2rem;
  background-color: transparent;
  color: var(--text-primary);
  border: 1px solid var(--text-primary);
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  border-radius: 0;
}

.back-btn:hover {
  background-color: var(--text-primary);
  color: var(--background);
}

.world-detail {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.world-canvas-container {
  width: 100%;
  height: 600px;
  border: 1px solid var(--border);
  background-color: var(--surface);
  border-radius: 0;
}

.phaser-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.loading,
.error {
  text-align: center;
  padding: 2rem;
  border: 1px solid var(--border);
  background-color: var(--surface);
  border-radius: 0;
}

.loading {
  color: var(--text-secondary);
}

.error {
  color: var(--error);
  border-color: var(--error);
}
</style>
