<template>
  <div class="world-view-container">
    <div class="header-controls">
      <button @click="goBack" class="back-btn">← Back to Community</button>
      <LikeButton
        v-if="world && authStore.isAuthenticated"
        :world-id="route.params.worldId"
        :like-count="world.like_count"
        :is-liked="isLiked"
        @update:like-count="world.like_count = $event"
        @update:is-liked="isLiked = $event"
      />
    </div>

    <div v-if="loading" class="loading">Loading world...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="!world" class="error">World not found</div>

    <div v-else class="world-detail">
        <div id="phaser-container-view" class="phaser-container"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getTileImageUrl } from '../services/urls'
import { PhaserGameWrapper } from '../phaser/PhaserGame'
import LikeButton from '../components/LikeButton.vue'
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
  } catch (err) {
    error.value = 'Failed to load world'
    console.error(err)
    loading.value = false
    return
  }

  loading.value = false

  // Wait for Vue to render the DOM element
  await nextTick()

  // Initialize Phaser game
  phaserGame = new PhaserGameWrapper()
  mainScene = await phaserGame.initialize('phaser-container-view')

  if (!mainScene) {
    error.value = 'Failed to initialize game'
    return
  }

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
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: self-start;
}

.header-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
  align-items: center;
}

.back-btn {
  background-color: transparent;
  color: var(--text-primary);
  border: 1px solid var(--text-primary);
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.back-btn:hover {
  background-color: var(--text-primary);
  color: var(--background);
}

.world-detail {
  flex: 1;
  margin-bottom: 1rem;
  width: 100%;
  border: 1px solid var(--border);
  background-color: var(--surface);
  border-radius: 10px;
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
