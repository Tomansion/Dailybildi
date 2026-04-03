<template>
  <div class="inventory-container" @pointerdown.stop @click.stop>
    <div class="inventory-header">
      <h3>Inventory</h3>
      <p class="block-count">
        {{ totalBlocks }} {{ totalBlocks === 1 ? "block" : "blocks" }}
      </p>
    </div>

    <div class="scroll-area">
      <div class="blocks-grid">
        <div v-if="blocks.length === 0" class="no-blocks">
          No blocks available
        </div>
        <div
          v-for="block in blocks"
          :key="block.blockCatalogKey"
          class="block-card"
          :class="{ selected: selectedBlockKey === block.blockCatalogKey }"
          @click="$emit('block-select', block)"
        >
          <div class="block-image">
            <img
              :src="block.blockData.imagePath"
              :alt="block.blockCatalogKey"
            />
          </div>
          <div class="block-info">
            <p class="block-quantity">{{ block.quantity }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="inventory-footer">
      <p class="timer-label">New blocks in:</p>
      <p class="timer">{{ timeRemaining }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { getUniverseConfigPath } from "@/lib/constants";

const props = defineProps({
  blocks: {
    type: Array,
    default: () => [],
  },
  selectedBlockKey: {
    type: String,
    default: null,
  },
});

defineEmits(["block-select"]);

const backgroundColor = ref("#ffffff");
const timeRemaining = ref("--:--:--");
let intervalId = null;

const totalBlocks = computed(() => {
  return props.blocks.reduce((sum, b) => sum + b.quantity, 0);
});

const loadConfig = async () => {
  try {
    const response = await fetch(getUniverseConfigPath());
    const config = await response.json();
    backgroundColor.value = config.backgroundColor || "#ffffff";
  } catch (error) {
    console.error("Failed to load universe config:", error);
  }
};

const calculateTimeRemaining = () => {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
    ),
  );

  const diff = tomorrow.getTime() - now.getTime();

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  timeRemaining.value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

onMounted(() => {
  loadConfig();
  calculateTimeRemaining();
  intervalId = setInterval(calculateTimeRemaining, 1000);
});

onBeforeUnmount(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>

<style scoped>
.inventory-container {
  width: 16rem;
  height: 100%;
  background-color: var(--card);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  pointer-events: auto;
}

.inventory-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}

.inventory-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.block-count {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.scroll-area {
  flex: 1;
  overflow-y: auto;
}

.blocks-grid {
  padding: 0.75rem;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.no-blocks {
  grid-column: 1 / -1;
  padding: 2rem 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.block-card {
  position: relative;
  background-color: var(--background);
  border: 2px solid transparent;
  border-radius: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.block-card:hover {
  border-color: var(--primary);
  transform: scale(1.05);
}

.block-card.selected {
  border-color: var(--primary);
  background-color: rgba(59, 130, 246, 0.1);
}

.block-image {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 0.375rem;
  margin-bottom: 0.5rem;
  background-color: var(--border);
}

.block-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.block-name {
  margin: 0;
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.8rem;
}

.block-quantity {
  position: absolute;
  top: 0rem;
  right: 0rem;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
}

.inventory-footer {
  padding: 0.75rem;
  border-top: 1px solid var(--border);
}

.timer-label {
  margin: 0 0 0.25rem 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.timer {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  font-family: monospace;
  color: var(--text-primary);
}
</style>
