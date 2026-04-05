<template>
  <div class="block-actions">
    <button v-if="hasSelectedBlock" class="action-btn" title="Rotate 90° (R)" @click="onRotate">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 4v6h6M23 20v-6h-6" />
        <path d="M20.49 9A9 9 0 0 0 5.64 5.64M3.51 15A9 9 0 0 0 18.36 18.36" />
      </svg>
      <span class="shortcut">R</span>
    </button>
    <button v-if="hasSelectedBlock" class="action-btn" title="Flip Horizontal (H)" @click="onFlipHorizontal">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 4h18v16H3zM10 9v6M14 9v6" />
      </svg>
      <span class="shortcut">H</span>
    </button>
    <button v-if="hasSelectedBlock" class="action-btn" title="Flip Vertical (V)" @click="onFlipVertical">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 3v18h16V3zM9 10h6M9 14h6" />
      </svg>
      <span class="shortcut">V</span>
    </button>
    <button v-if="hasSelectedBlock" class="action-btn danger" title="Discard" @click="onDiscard">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    </button>
    <div v-if="hasSelectedBlock" class="separator"></div>
    <button class="action-btn" title="Zoom in" @click="onZoomIn">
      <img src="/icons/zoom+.svg" class="icon" alt="Zoom in" />
    </button>
    <button class="action-btn" title="Zoom out" @click="onZoomOut">
      <img src="/icons/zoom-.svg" class="icon" alt="Zoom out" />
    </button>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  hasSelectedBlock: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['rotate', 'flip-horizontal', 'flip-vertical', 'discard', 'zoom-in', 'zoom-out'])

const onRotate = () => emit('rotate')
const onFlipHorizontal = () => emit('flip-horizontal')
const onFlipVertical = () => emit('flip-vertical')
const onDiscard = () => emit('discard')
const onZoomIn = () => emit('zoom-in')
const onZoomOut = () => emit('zoom-out')
</script>

<style scoped>
.block-actions {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  gap: 0.25rem;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0;
  padding: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  background-color: var(--background);
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-primary);
  position: relative;
  width: 40px;
  height: 40px;
  padding: 0;
}

.action-btn:hover {
  background-color: var(--text-primary);
  color: var(--background);
  border-color: var(--text-primary);
}

.action-btn.danger:hover {
  background-color: var(--error);
  border-color: var(--error);
  color: var(--background);
}

.separator {
  width: 1px;
  background-color: var(--border);
  align-self: stretch;
  margin: 0 0.25rem;
}

.action-btn img {
  width: 20px;
  height: 20px;
}

.icon {
  width: 20px;
  height: 20px;
}

.shortcut {
  position: absolute;
  bottom: 1px;
  right: 2px;
  font-size: 0.5rem;
  font-weight: bold;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 1px 2px;
  border-radius: 0;
  line-height: 1;
  min-width: 12px;
  text-align: center;
}

@media (max-width: 768px) {
  .block-actions {
    flex-direction: column;
  }
  .shortcut {
    display: none;
  }
}
</style>
