import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'

export const useInventoryStore = defineStore('inventory', () => {
  const inventory = ref(null)
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
    loading,
    error,
    fetchInventory,
    addBlock
  }
})
