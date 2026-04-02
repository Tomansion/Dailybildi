<template>
  <div class="world-view-container">
    <button @click="goBack" class="back-btn">← Back to Community</button>

    <div v-if="loading" class="loading">Loading world...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <div v-else class="world-detail">
      <div class="world-header">
        <h1>{{ world.user.username }}'s World</h1>
        <div class="world-actions">
          <button @click="toggleLike" :class="{ liked: isLiked }" class="like-btn">
            {{ isLiked ? '❤️' : '🤍' }} {{ world.like_count }}
          </button>
        </div>
      </div>

      <div class="world-preview">
        <div class="preview-placeholder">
          <p>World created: {{ formatDate(world.created_at) }}</p>
          <p>Last updated: {{ formatDate(world.updated_at) }}</p>
          <p>Total blocks: {{ world.placed_blocks.length }}</p>
        </div>
      </div>

      <div class="world-info">
        <div class="info-card card">
          <h3>World Info</h3>
          <ul>
            <li>
              <span class="label">Creator:</span>
              <span>{{ world.user.username }}</span>
            </li>
            <li>
              <span class="label">Created:</span>
              <span>{{ formatDate(world.created_at) }}</span>
            </li>
            <li>
              <span class="label">Last Updated:</span>
              <span>{{ formatDate(world.updated_at) }}</span>
            </li>
            <li>
              <span class="label">Placed Blocks:</span>
              <span>{{ world.placed_blocks.length }}</span>
            </li>
            <li>
              <span class="label">Likes:</span>
              <span>{{ world.like_count }}</span>
            </li>
          </ul>
        </div>

        <div v-if="world.placed_blocks.length > 0" class="blocks-info card">
          <h3>Placed Blocks</h3>
          <div class="blocks-list">
            <div
              v-for="(block, index) in world.placed_blocks"
              :key="index"
              class="block-item"
            >
              <span class="block-name">{{ block.block_catalog.block_id }}</span>
              <span class="block-position">@ ({{ block.grid_x }}, {{ block.grid_y }})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const world = ref(null)
const loading = ref(false)
const error = ref(null)
const isLiked = ref(false)

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
  } finally {
    loading.value = false
  }
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
</script>

<style scoped>
.world-view-container {
  max-width: 1000px;
  margin: 0 auto;
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

.world-preview {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, #1e293b, #0f172a);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  overflow: hidden;
}

.preview-placeholder {
  text-align: center;
  color: var(--text-secondary);
}

.preview-placeholder p {
  margin: 0.5rem 0;
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
