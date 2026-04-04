<template>
  <div class="canvas-container">

    <div class="canvas-content">
      <Inventory
        :blocks="inventoryBlocks"
        :selectedBlockKey="selectedBlockForPlacement?.blockCatalogKey || null"
        @block-select="handleBlockSelect"
      />

      <div 
        id="phaser-container" 
        class="phaser-container"
        @dragover="handleDragOver"
        @drop="handleDropBlock"
        @dragleave="handleDragLeave"
      ></div>

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

const loading = ref(true)
const error = ref(null)
const hasSelectedBlock = ref(false)
const selectedBlockForPlacement = ref(null)

let phaserGame = null
let mainScene = null

const inventoryBlocks = computed(() => {
  const blocks = inventoryStore.inventory?.blocks || []
  return blocks.map(block => ({
    blockCatalogKey: block.block_id,
    quantity: block.quantity,
    blockData: {
      id: block.block_catalog_id,
      layer: block.layer,
      rarity: block.rarity,
      imagePath: getTileImageUrl(block.image_path)
    }
  }))
})

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

const handleDragOver = (event) => {
  // Prevent default to allow drop
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
  // Optional: add visual feedback
  event.target.classList.add('drag-over')
}

const handleDragLeave = (event) => {
  // Remove visual feedback when dragging leaves
  if (event.target.id === 'phaser-container') {
    event.target.classList.remove('drag-over')
  }
}

const handleDropBlock = async (event) => {
  event.preventDefault()
  event.target.classList.remove('drag-over')
  
  try {
    // Extract block data from dataTransfer
    const blockDataJson = event.dataTransfer.getData('application/json')
    if (!blockDataJson) {
      return
    }
    
    const blockData = JSON.parse(blockDataJson)
    
    // Get position relative to the phaser container (not viewport)
    const phaserContainer = document.getElementById('phaser-container')
    const rect = phaserContainer.getBoundingClientRect()
    const pointer = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
    
    // Call the Phaser method to place block at drop position
    if (mainScene) {
      mainScene.placeBlockAtDropPosition(blockData, pointer)
    }
  } catch (err) {
    console.error('Failed to process block drop:', err)
  }
}

const cancelBlockPlacement = () => {
  selectedBlockForPlacement.value = null
  if (mainScene) {
    mainScene.cancelBlockPlacement()
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
    
    // Initialize Phaser game
    phaserGame = new PhaserGameWrapper()
    phaserGame.initialize('phaser-container')

    // Wait for scene to be ready
    const checkScene = setInterval(() => {
      mainScene = phaserGame.getMainScene()
      if (mainScene) {
        clearInterval(checkScene)

        // Collect all block images to load (from both inventory and placed blocks)
        // Use a Map to deduplicate by block catalog id
        const blockImageMap = new Map()
        
        // Add inventory blocks
        inventoryBlocks.value.forEach(block => {
          blockImageMap.set(block.blockData.id, {
            id: block.blockData.id,
            layer: block.blockData.layer,
            rarity: block.blockData.rarity,
            imagePath: block.blockData.imagePath
          })
        })
        
        // Add placed blocks (they may not be in inventory anymore)
        placedBlocks.forEach(block => {
          if (!blockImageMap.has(block.blockData.id)) {
            blockImageMap.set(block.blockData.id, {
              id: block.blockData.id,
              layer: block.blockData.layer,
              rarity: block.blockData.rarity,
              imagePath: block.blockData.imagePath
            })
          }
        })
        
        const allBlockImages = Array.from(blockImageMap.values())

        // Setup callbacks
        mainScene.setOnBlockPlaced(async (blockCatalogKey, gridX, gridY) => {
          try {
            await inventoryStore.placeBlock(blockCatalogKey, gridX, gridY)
            // Reload inventory and blocks
            await inventoryStore.fetchInventory()
            const updated = await inventoryStore.fetchWorldBlocks()
            if (updated && mainScene) {
              mainScene.loadBlocks(updated)
              // Select the last placed block (it's the one at the end of the updated list)
              if (updated.length > 0) {
                const lastBlock = updated[updated.length - 1]
                mainScene.selectBlockByKey(lastBlock.blockKey)
                hasSelectedBlock.value = true
              }
            }
            // Check if the block type is still in inventory
            const blockStillInInventory = inventoryBlocks.value.some(
              block => block.blockCatalogKey === blockCatalogKey && block.quantity > 0
            )
            
            // Only cancel placement if the block is no longer in inventory (was the last one)
            if (!blockStillInInventory) {
              cancelBlockPlacement()
            }
            // Otherwise keep it selected for placing more of the same type
          } catch (err) {
            console.error('Failed to place block:', err)
          }
        })

        mainScene.setOnBlockSelected((blockKey) => {
          hasSelectedBlock.value = true
        })

        mainScene.setOnBlockDeselected(() => {
          hasSelectedBlock.value = false
        })

        mainScene.setOnBlockUpdated(async (blockKey, updates) => {
          try {
            if (updates.removed) {
              await inventoryStore.removeBlock(blockKey)
              // Reload inventory when block is removed
              await inventoryStore.fetchInventory()
            } else {
              await inventoryStore.updateBlock(blockKey, updates)
            }
          } catch (err) {
            console.error('Failed to update block:', err)
          }
        })

        // Load images first, then blocks
        if (allBlockImages.length > 0) {
          mainScene.loadBlockImages(allBlockImages, () => {
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
  padding: 0.75rem;
  background-color: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.canvas-header h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
}

.header-btn {
  background-color: var(--text-primary);
  color: var(--background);
  border-color: var(--text-primary);
}

.header-btn:hover {
  opacity: 0.8;
}

.phaser-container.drag-over {
  background-color: rgba(0, 0, 0, 0.05);
  border: 2px dashed var(--border);
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
  background-color: var(--background);
}

.loading,
.error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 2rem;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0;
  z-index: 500;
  text-align: center;
}

.loading {
  color: var(--text-secondary);
}

.error-message {
  color: var(--error);
  border-color: var(--error);
}
</style>
