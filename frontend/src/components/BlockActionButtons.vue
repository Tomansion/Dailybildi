<template>
  <div class="block-actions">
    <div class="center-actions">
      <button class="action-btn" title="Zoom in" @click.stop="onZoomIn">
        <img src="/icons/zoom+.svg" class="icon" alt="Zoom in" />
      </button>
      <button class="action-btn" title="Zoom out" @click.stop="onZoomOut">
        <img src="/icons/zoom-.svg" class="icon" alt="Zoom out" />
      </button>
      <button
        class="action-btn"
        :class="{ active: selectionModeActive }"
        title="Toggle selection mode"
        @click.stop="onToggleSelectionMode"
      >
        <img src="/icons/selection.svg" class="icon" alt="Selection mode" />
      </button>
      <div v-if="hasSelectedBlock" class="separator"></div>
      <button
        v-if="hasSelectedBlock"
        class="action-btn"
        title="Rotate 90° (R)"
        @click.stop="onRotate"
      >
        <svg
          class="icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M1 4v6h6M23 20v-6h-6" />
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64M3.51 15A9 9 0 0 0 18.36 18.36" />
        </svg>
        <span class="shortcut">R</span>
      </button>
      <button
        v-if="hasSelectedBlock"
        class="action-btn"
        title="Flip Horizontal (H)"
        @click.stop="onFlipHorizontal"
      >
        <svg
          class="icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M3 4h18v16H3zM10 9v6M14 9v6" />
        </svg>
        <span class="shortcut">H</span>
      </button>
      <button
        v-if="hasSelectedBlock"
        class="action-btn"
        title="Flip Vertical (V)"
        @click.stop="onFlipVertical"
      >
        <svg
          class="icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M4 3v18h16V3zM9 10h6M9 14h6" />
        </svg>
        <span class="shortcut">V</span>
      </button>
    </div>

    <div class="right-actions">
      <button
        v-if="hasSelectedBlock"
        class="action-btn danger"
        title="Discard"
        @click.stop="onDiscard"
      >
        <svg
          class="icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="3 6 5 6 21 6"></polyline>
          <path
            d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
          />
        </svg>
      </button>
      <button class="action-btn" title="Export as PNG" @click.stop="onExportPng">
        <img src="/icons/photo.svg" class="icon" alt="Export as PNG" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";

const props = defineProps({
  hasSelectedBlock: {
    type: Boolean,
    default: false,
  },
  selectionModeActive: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "rotate",
  "flip-horizontal",
  "flip-vertical",
  "discard",
  "export-png",
  "zoom-in",
  "zoom-out",
  "toggle-selection-mode",
]);

const onRotate = () => emit("rotate");
const onFlipHorizontal = () => emit("flip-horizontal");
const onFlipVertical = () => emit("flip-vertical");
const onDiscard = () => emit("discard");
const onExportPng = () => emit("export-png");
const onZoomIn = () => emit("zoom-in");
const onZoomOut = () => emit("zoom-out");
const onToggleSelectionMode = () => emit("toggle-selection-mode");
</script>

<style scoped>
.block-actions {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  padding: 0.5rem;
  width: 100%;
  align-items: center;
}

.center-actions {
  grid-column: 2;
  display: flex;
  gap: 0.25rem;
  justify-content: center;
  align-items: center;
}

.right-actions {
  grid-column: 3;
  justify-self: end;
  display: flex;
  gap: 0.25rem;
  align-items: center;
  margin-left: 1rem;
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

.action-btn.active {
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
  filter: brightness(0) saturate(100%);
  transition: filter 0.2s;
}

.icon {
  width: 20px;
  height: 20px;
  color: currentColor;
}

.action-btn:hover img,
.action-btn.active img,
.action-btn.danger:hover img {
  filter: brightness(0) saturate(100%) invert(1);
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
    position: inherit;
    padding-left: 0.5rem;
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .center-actions,
  .right-actions {
    display: flex;
    align-items: center;
  }

  .center-actions {
    justify-content: center;
    gap: 0.25rem;
    flex-wrap: wrap;
  }

  .right-actions {
    margin-left: 0;
    flex-shrink: 0;
  }

  .shortcut {
    display: none;
  }
}
</style>
