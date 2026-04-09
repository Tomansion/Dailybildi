<template>
  <div class="community-container">
    <div class="container">
      <div class="community-header">
        <div>
          <h1>Community</h1>
          <p class="header-subtitle">Explore and like other players' creations</p>
        </div>
        <div class="sort-controls">
          <label for="sort">Sort by:</label>
          <select id="sort" v-model="sortBy" @change="fetchWorlds">
            <option value="recent">Recent</option>
            <option value="likes">Most Liked</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="loading">Loading worlds...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <div v-else-if="worlds.length === 0" class="empty-state">
        No worlds found yet. Be the first to create one!
      </div>

      <div v-else class="worlds-grid">
        <BaseCard
          v-for="world in worlds"
          :key="world.id"
          class="world-card"
          @click="viewWorld(world.id)"
          :style="{ backgroundColor: world.universeConfig?.backgroundColor || 'var(--surface)' }"
        >
          <WorldPreview
            :world="world"
            :universe-config="world.universeConfig"
            :canvas-width="240"
            :canvas-height="170"
            class="world-preview"
          />
          <div class="card-content">
            <div class="card-header">
              <div>
                <h3>{{ world.user?.display_name || 'Unknown User' }}</h3>
                <p class="world-date">{{ formatDate(world.created_at) }}</p>
              </div>
            </div>
            <div class="world-stats">
              <span class="stat">
                <img src="/icons/bricks.svg" alt="placed blocks" class="stat-icon" />
                {{ world.placed_blocks.length }}
              </span>
                <LikeButton
                :world-id="world.id"
                :like-count="world.like_count"
                :is-liked="world.liked"
                @update:like-count="world.like_count = $event"
                @update:is-liked="world.liked = $event"
                />
            </div>
          </div>
        </BaseCard>
      </div>

      <div v-if="!loading && hasMore" class="load-more-container">
        <BaseButton @click="loadMore" :disabled="loading">
          Load More
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'
import BaseCard from '../components/base/BaseCard.vue'
import BaseButton from '../components/base/BaseButton.vue'
import WorldPreview from '../components/WorldPreview.vue'
import LikeButton from '../components/LikeButton.vue'

const router = useRouter()
const authStore = useAuthStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)

const worlds = ref([])
const loading = ref(false)
const error = ref(null)
const sortBy = ref('likes')
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
  background-color: var(--background);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

h1 {
  margin-bottom: 0.25rem;
  letter-spacing: -1.5px;
}

.header-subtitle {
  color: var(--text-secondary);
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.community-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 2rem;
}

.sort-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  min-width: 200px;
}

.sort-controls label {
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.sort-controls select {
  background-color: var(--background);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 0;
  padding: 0.5rem;
  cursor: pointer;
  flex: 1;
  font-family: inherit;
  font-size: 0.9rem;
}

.sort-controls select:focus {
  outline: none;
  border-color: var(--text-primary);
}

.worlds-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.world-card {
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: hidden;
}

.world-card:hover {
  border-color: var(--text-primary);
  transform: translateY(-2px);
}

.world-preview {
  width: 100%;
}

.card-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

.world-card h3 {
  margin: 0;
  font-size: 1.1rem;
  letter-spacing: -0.5px;
}

.world-date {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin: 0;
}

.world-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
}

.stat {
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
}

.like-icon {
  width: 1rem;
  height: 1rem;
  object-fit: contain;
}

.stat-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  object-fit: contain;
}

.load-more-container {
  text-align: center;
  margin: 2rem 0;
}

.empty-state,
.error-message,
.loading {
  text-align: center;
  padding: 3rem;
  border: 1px solid var(--border);
  background-color: var(--surface);
  border-radius: 0;
}

.empty-state,
.loading {
  color: var(--text-secondary);
}

.error-message {
  color: var(--error);
  border-color: var(--error);
}
</style>
