import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { getTileImageUrl } from '../services/urls'

export const useInventoryStore = defineStore('inventory', () => {
  const inventory = ref(null)
  const placedBlocks = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchInventory = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get('/inventory')
      inventory.value = response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchWorldBlocks = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await api.get('/world')
      const world = response.data
      
      // Transform placed blocks to match Phaser format
      placedBlocks.value = (world.placed_blocks || []).map(block => ({
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
      
      return placedBlocks.value
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const placeBlock = async (blockCatalogKey, gridX, gridY) => {
    try {
      // Find the block catalog ID from the inventory
      const block = inventory.value?.blocks?.find(
        b => b.block_id === blockCatalogKey
      )
      
      if (!block) {
        throw new Error(`Block ${blockCatalogKey} not found in inventory`)
      }

      const response = await api.post('/world', {
        block_catalog_id: block.block_catalog_id,
        grid_x: gridX,
        grid_y: gridY,
        z_order: 0,
        rotation: 0,
        flip_x: false,
        flip_y: false
      })
      
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const updateBlock = async (blockKey, updates) => {
    try {
      const response = await api.patch(`/world/blocks/${blockKey}`, {
        grid_x: updates.gridX,
        grid_y: updates.gridY,
        rotation: updates.rotation,
        flip_x: updates.flipX,
        flip_y: updates.flipY,
        z_order: updates.zOrder || 0
      })
      
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const removeBlock = async (blockKey) => {
    try {
      await api.delete(`/world/blocks/${blockKey}`)
      // Remove from local state
      placedBlocks.value = placedBlocks.value.filter(b => b._key !== blockKey)
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const addBlock = async (blockId, quantity = 1) => {
    try {
      await api.post('/inventory/add-block', null, {
        params: { block_id: blockId, quantity }
      })
      await fetchInventory()
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  return {
    inventory,
    placedBlocks,
    loading,
    error,
    fetchInventory,
    fetchWorldBlocks,
    placeBlock,
    updateBlock,
    removeBlock,
    addBlock
  }
})
