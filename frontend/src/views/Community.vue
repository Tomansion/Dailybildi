<template>
  <div class="community-container">
    <div class="community-header">
      <h1>Community</h1>
      <div class="sort-controls">
        <label>Sort by:</label>
        <select v-model="sortBy" @change="fetchWorlds">
          <option value="recent">Recent</option>
          <option value="likes">Most Liked</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading worlds...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <div class="worlds-grid">
      <div
        v-for="world in worlds"
        :key="world.id"
        class="world-card card"
        @click="viewWorld(world.id)"
      >
        <div class="world-preview">
          <div class="preview-placeholder">{{ world.user.username }}'s World</div>
        </div>
        <div class="world-info">
          <h3>{{ world.user.username }}</h3>
          <p class="world-date">{{ formatDate(world.created_at) }}</p>
          <div class="world-stats">
            <span class="like-count">❤️ {{ world.like_count }}</span>
            <span class="block-count">🧱 {{ world.placed_blocks.length }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && worlds.length === 0" class="no-worlds">
      No worlds found yet. Be the first to create one!
    </div>

    <div v-if="hasMore" class="load-more">
      <button @click="loadMore" :disabled="loading">Load More</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router = useRouter()

const worlds = ref([])
const loading = ref(false)
const error = ref(null)
const sortBy = ref('recent')
const skip = ref(0)
const limit = ref(20)
const hasMore = ref(false)
const total = ref(0)

const fetchWorlds = async () => {
  loading.value = true
  error.value = null
  skip.value = 0

  try {
    const response = await api.get('/community/worlds', {
      params: {
        skip: skip.value,
        limit: limit.value,
        sort_by: sortBy.value
      }
    })

    worlds.value = response.data.items
    total.value = response.data.total
    hasMore.value = response.data.has_more
  } catch (err) {
    error.value = 'Failed to load worlds'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  loading.value = true
  skip.value += limit.value

  try {
    const response = await api.get('/community/worlds', {
      params: {
        skip: skip.value,
        limit: limit.value,
        sort_by: sortBy.value
      }
    })

    worlds.value.push(...response.data.items)
    hasMore.value = response.data.has_more
  } catch (err) {
    error.value = 'Failed to load more worlds'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const viewWorld = (worldId) => {
  router.push(`/community/${worldId}`)
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString()
}

onMounted(() => {
  fetchWorlds()
})
</script>

<style scoped>
.community-container {
  max-width: 1200px;
  margin: 0 auto;
}

.community-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.community-header h1 {
  margin: 0;
  color: var(--text-primary);
}

.sort-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.sort-controls label {
  color: var(--text-secondary);
}

.sort-controls select {
  background-color: var(--surface);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  padding: 0.5rem;
  cursor: pointer;
}

.worlds-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.world-card {
  cursor: pointer;
  transition: all 0.3s;
  overflow: hidden;
}

.world-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  border-color: var(--primary);
}

.world-preview {
  width: 100%;
  aspect-ratio: 1;
  background: linear-gradient(135deg, #1e293b, #0f172a);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  border-radius: 0.375rem;
  overflow: hidden;
}

.preview-placeholder {
  color: var(--text-secondary);
  font-size: 0.875rem;
  text-align: center;
  padding: 1rem;
}

.world-info h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  font-size: 1.125rem;
}

.world-date {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0 0 0.75rem 0;
}

.world-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.load-more {
  text-align: center;
  margin: 2rem 0;
}

.load-more button {
  padding: 0.75rem 2rem;
  font-size: 1rem;
}

.no-worlds {
  text-align: center;
  color: var(--text-secondary);
  padding: 3rem 1rem;
  background-color: var(--surface);
  border-radius: 0.5rem;
  border: 1px dashed var(--border);
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
