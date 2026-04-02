<template>
  <div class="canvas-container">
    <div class="canvas-header">
      <h2>Canvas Editor</h2>
      <div class="header-buttons">
        <button @click="goHome" class="header-btn" title="Center view">Home</button>
        <button @click="toggleInventory" class="header-btn">
          Inventory ({{ totalBlocks }})
        </button>
      </div>
    </div>

    <div class="canvas-content">
      <Inventory
        v-if="showInventory"
        :blocks="inventoryBlocks"
        :selectedBlockKey="selectedBlockForPlacement?.blockCatalogKey || null"
        @block-select="handleBlockSelect"
      />

      <div id="phaser-container" class="phaser-container"></div>

      <BlockActionButtons
        :hasSelectedBlock="hasSelectedBlock"
        @rotate="handleRotate"
        @flip-horizontal="handleFlipHorizontal"
        @flip-vertical="handleFlipVertical"
        @discard="handleDiscard"
      />
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useInventoryStore } from '../stores/inventory'
import { getTileImageUrl } from '../services/urls'
import { PhaserGameWrapper } from '../phaser/PhaserGame'
import Inventory from '../components/Inventory.vue'
import BlockActionButtons from '../components/BlockActionButtons.vue'

const route = useRoute()
const inventoryStore = useInventoryStore()

const showInventory = ref(false)
const loading = ref(true)
const error = ref(null)
const hasSelectedBlock = ref(false)
const selectedBlockForPlacement = ref(null)

let phaserGame = null
let mainScene = null

const inventoryBlocks = computed(() => {
  const blocks = inventoryStore.inventory?.blocks || []
  return blocks.map(block => ({
    blockCatalogKey: block.block_catalog.block_id,
    quantity: block.quantity,
    blockData: {
      id: block.block_catalog.id,
      layer: block.block_catalog.layer,
      rarity: block.block_catalog.rarity,
      imagePath: getTileImageUrl(block.block_catalog.image_path)
    }
  }))
})

const totalBlocks = computed(() => {
  return inventoryBlocks.value.reduce((sum, b) => sum + b.quantity, 0)
})

const toggleInventory = () => {
  showInventory.value = !showInventory.value
}

const goHome = () => {
  if (mainScene) {
    mainScene.goHome()
  }
}

const handleBlockSelect = (block) => {
  // Toggle - if clicking the same block again, deselect
  if (selectedBlockForPlacement.value?.blockCatalogKey === block.blockCatalogKey) {
    cancelBlockPlacement()
    return
  }

  selectedBlockForPlacement.value = {
    imagePath: block.blockData.imagePath,
    blockCatalogKey: block.blockCatalogKey,
    id: block.blockData.id,
    layer: block.blockData.layer,
    rarity: block.blockData.rarity
  }

  if (mainScene) {
    mainScene.selectBlockForPlacement(selectedBlockForPlacement.value)
  }
}

const handleRotate = () => {
  if (mainScene) {
    mainScene.rotateSelectedBlock()
  }
}

const handleFlipHorizontal = () => {
  if (mainScene) {
    mainScene.flipSelectedBlockHorizontal()
  }
}

const handleFlipVertical = () => {
  if (mainScene) {
    mainScene.flipSelectedBlockVertical()
  }
}

const handleDiscard = () => {
  if (mainScene) {
    mainScene.removeSelectedBlock()
    hasSelectedBlock.value = false
  }
}

onMounted(async () => {
  try {
    // Fetch user's inventory
    await inventoryStore.fetchInventory()

    // Fetch placed blocks
    const placedBlocks = await inventoryStore.fetchWorldBlocks()
    
    const blockImages = inventoryBlocks.value.map(block => ({
      id: block.blockData.id,
      layer: block.blockData.layer,
      rarity: block.blockData.rarity,
      imagePath: block.blockData.imagePath
    }))

    // Initialize Phaser game
    phaserGame = new PhaserGameWrapper()
    phaserGame.initialize('phaser-container')

    // Wait for scene to be ready
    const checkScene = setInterval(() => {
      mainScene = phaserGame.getMainScene()
      if (mainScene) {
        clearInterval(checkScene)

        // Setup callbacks
        mainScene.setOnBlockPlaced(async (blockCatalogKey, gridX, gridY) => {
          try {
            await inventoryStore.placeBlock(blockCatalogKey, gridX, gridY)
            // Reload blocks
            const updated = await inventoryStore.fetchWorldBlocks()
            if (updated && mainScene) {
              mainScene.loadBlocks(updated)
            }
          } catch (err) {
            console.error('Failed to place block:', err)
          }
        })

        mainScene.setOnBlockSelected((blockKey) => {
          hasSelectedBlock.value = true
        })

        mainScene.setOnBlockUpdated(async (blockKey, updates) => {
          try {
            if (updates.removed) {
              await inventoryStore.removeBlock(blockKey)
            } else {
              await inventoryStore.updateBlock(blockKey, updates)
            }
          } catch (err) {
            console.error('Failed to update block:', err)
          }
        })

        // Load images first, then blocks
        if (blockImages.length > 0) {
          mainScene.loadBlockImages(blockImages, () => {
            mainScene.loadBlocks(placedBlocks)
          })
        } else {
          mainScene.loadBlocks(placedBlocks)
        }

        loading.value = false
      }
    }, 100)

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkScene)
      if (!mainScene) {
        error.value = 'Failed to initialize game'
        loading.value = false
      }
    }, 10000)
  } catch (err) {
    error.value = 'Failed to load canvas: ' + (err.message || 'Unknown error')
    console.error(err)
    loading.value = false
  }
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
.canvas-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--background);
  overflow: hidden;
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

.header-buttons {
  display: flex;
  gap: 0.5rem;
}

.header-btn {
  background-color: var(--primary);
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.header-btn:hover {
  background-color: var(--primary-dark);
}

.canvas-content {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

.phaser-container {
  flex: 1;
  position: relative;
  overflow: hidden;
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
  z-index: 500;
}

.loading {
  color: var(--text-secondary);
}

.error-message {
  color: var(--danger);
}
</style>
