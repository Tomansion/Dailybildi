<template>
  <button 
    class="like-btn"
    :class="{ liked: localIsLiked }"
    :disabled="isLoading"
    @click="handleClick"
  >
    <img 
      :src="localIsLiked ? '/icons/heart-filled.svg' : '/icons/heart.svg'" 
      alt="like" 
      class="like-icon" 
    />
    {{ localLikeCount }}
  </button>
</template>

<script setup>
import { ref } from 'vue'
import api from '../services/api'

const props = defineProps({
  worldId: {
    type: String,
    required: true
  },
  likeCount: {
    type: Number,
    required: true
  },
  isLiked: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['update:likeCount', 'update:isLiked'])

const localLikeCount = ref(props.likeCount)
const localIsLiked = ref(props.isLiked)
const isLoading = ref(false)

const handleClick = async (event) => {
  event.stopPropagation()
  
  if (isLoading.value) return
  
  const wasLiked = localIsLiked.value
  const previousCount = localLikeCount.value
  isLoading.value = true
  
  try {
    if (wasLiked) {
      await api.delete(`/likes/${props.worldId}`)
      localLikeCount.value = Math.max(0, localLikeCount.value - 1)
      localIsLiked.value = false
    } else {
      await api.post(`/likes/${props.worldId}`)
      localLikeCount.value++
      localIsLiked.value = true
    }
    
    emit('update:likeCount', localLikeCount.value)
    emit('update:isLiked', localIsLiked.value)
  } catch (err) {
    console.error('Failed to toggle like', err)
    localIsLiked.value = wasLiked
    localLikeCount.value = previousCount
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.like-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
  border-radius: 0;
}

.like-btn:hover:not(:disabled) {
  background-color: var(--error);
  color: var(--background);
  border-color: var(--error);
}

.like-btn.liked {
  border-color: var(--error);
  color: var(--error);
}

.like-btn.liked .like-icon {
  filter: invert(34%) sepia(100%) saturate(748%) hue-rotate(340deg) brightness(95%) contrast(90%);
}

.like-btn.liked:hover {
  background-color: transparent;
  border-color: var(--error);
  color: var(--error);
}

.like-btn:disabled {
  opacity: 0.6;
}

.like-icon {
  width: 1rem;
  height: 1rem;
  object-fit: contain;
}
</style>
