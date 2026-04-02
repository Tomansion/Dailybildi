<template>
  <div class="canvas-container">
    <div class="canvas-header">
      <h2>Your Canvas</h2>
      <button @click="goToInventory" class="inventory-btn">Inventory ({{ blocksCount }})</button>
    </div>

    <div id="phaser-container" class="phaser-container"></div>

    <div v-if="showInventory" class="inventory-panel">
      <div class="inventory-header">
        <h3>Inventory</h3>
        <button @click="showInventory = false" class="close-btn">✕</button>
      </div>
      <div class="blocks-grid">
        <div
          v-for="block in inventoryBlocks"
          :key="block.id"
          class="inventory-block"
          @click="selectBlock(block)"
          :class="{ selected: selectedBlock?.id === block.id }"
        >
          <div class="block-image">
            <img :src="getBlockImagePath(block.block_catalog)" :alt="block.block_catalog.block_id" />
          </div>
          <div class="block-info">
            <p class="block-name">{{ block.block_catalog.block_id }}</p>
            <p class="block-quantity">{{ block.quantity }}</p>
          </div>
        </div>
      </div>
      <div v-if="selectedBlock" class="block-actions">
        <p>Selected: {{ selectedBlock.block_catalog.block_id }}</p>
        <p>Quantity: {{ selectedBlock.quantity }}</p>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useInventoryStore } from '../stores/inventory'
import { useRouter } from 'vue-router'
import api from '../services/api'
import { getTileImageUrl } from '../services/urls'
import PhaserGame from '../utils/PhaserGame'

const route = useRoute()
const router = useRouter()
const inventoryStore = useInventoryStore()

const showInventory = ref(false)
const selectedBlock = ref(null)
const loading = ref(true)
const error = ref(null)
const worldId = ref(route.query.world_id || null)
let phaserGame = null

const inventoryBlocks = computed(() => inventoryStore.inventory?.blocks || [])
const blocksCount = computed(() => {
  return inventoryBlocks.value.reduce((sum, block) => sum + block.quantity, 0)
})

const goToInventory = () => {
  showInventory.value = !showInventory.value
}

const selectBlock = (block) => {
  selectedBlock.value = block
  // Notify Phaser game of selected block
  if (phaserGame && phaserGame.scene) {
    phaserGame.scene.events.emit('select_block', block)
  }
}

const getBlockImagePath = (blockCatalog) => {
  // Image is served from backend at /univers/{universe}/tiles/{image}
  // blockCatalog.image_path is like: univers/ink_castle/tiles/tile_X_Y_Z.png
  return getTileImageUrl(blockCatalog.image_path)
}

onMounted(async () => {
  try {
    // Fetch user's inventory
    await inventoryStore.fetchInventory()

    // Initialize Phaser game
    const container = document.getElementById('phaser-container')
    phaserGame = new PhaserGame(container)

    loading.value = false
  } catch (err) {
    error.value = 'Failed to load canvas'
    console.error(err)
    loading.value = false
  }
})
</script>

<style scoped>
.canvas-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--background);
}

.canvas-header {
  padding: 1rem;
  background-color: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.canvas-header h2 {
  margin: 0;
  color: var(--text-primary);
}

.inventory-btn {
  background-color: var(--primary);
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
}

.inventory-btn:hover {
  background-color: var(--primary-dark);
}

.phaser-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.inventory-panel {
  position: fixed;
  right: 0;
  top: 0;
  width: 350px;
  height: 100vh;
  background-color: var(--surface);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.inventory-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.inventory-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
}

.blocks-grid {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.inventory-block {
  background-color: var(--background);
  border: 2px solid transparent;
  border-radius: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.inventory-block:hover {
  border-color: var(--primary);
  transform: scale(1.05);
}

.inventory-block.selected {
  border-color: var(--primary);
  background-color: rgba(59, 130, 246, 0.1);
}

.block-image {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 0.375rem;
  margin-bottom: 0.5rem;
}

.block-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: var(--border);
}

.block-info {
  text-align: center;
  font-size: 0.875rem;
}

.block-name {
  margin: 0;
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.block-quantity {
  margin: 0.25rem 0 0 0;
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.block-actions {
  padding: 1rem;
  border-top: 1px solid var(--border);
  background-color: var(--background);
}

.block-actions p {
  margin: 0.25rem 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.loading,
.error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 2rem;
  background-color: var(--surface);
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  z-index: 50;
}

.loading {
  color: var(--text-secondary);
}

.error-message {
  color: var(--danger);
}
</style>
