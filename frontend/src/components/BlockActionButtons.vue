<template>
  <div v-if="hasSelectedBlock" class="block-actions">
    <button @click="onRotate" class="action-btn" title="Rotate 90° (R)">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 4v6h6M23 20v-6h-6"/>
        <path d="M20.49 9A9 9 0 0 0 5.64 5.64M3.51 15A9 9 0 0 0 18.36 18.36"/>
      </svg>
      <span class="shortcut">R</span>
    </button>
    <button @click="onFlipHorizontal" class="action-btn" title="Flip Horizontal (H)">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 4h18v16H3zM10 9v6M14 9v6"/>
      </svg>
      <span class="shortcut">H</span>
    </button>
    <button @click="onFlipVertical" class="action-btn" title="Flip Vertical (V)">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 3v18h16V3zM9 10h6M9 14h6"/>
      </svg>
      <span class="shortcut">V</span>
    </button>
    <button @click="onDiscard" class="action-btn danger" title="Discard">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
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

const emit = defineEmits(['rotate', 'flip-horizontal', 'flip-vertical', 'discard'])

const onRotate = () => emit('rotate')
const onFlipHorizontal = () => emit('flip-horizontal')
const onFlipVertical = () => emit('flip-vertical')
const onDiscard = () => emit('discard')
</script>

<style scoped>
.block-actions {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  gap: 0.5rem;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 0.5rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  background-color: var(--background);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-primary);
  position: relative;
}

.action-btn:hover {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
}

.action-btn.danger:hover {
  background-color: var(--danger);
  border-color: var(--danger);
}

.icon {
  width: 30px;
  height: 30px;
}

.shortcut {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 0.625rem;
  font-weight: bold;
  background-color: rgba(0, 0, 0, 0.3);
  color: white;
  padding: 2px 4px;
  border-radius: 2px;
  line-height: 1;
  min-width: 16px;
  text-align: center;
}
</style>
