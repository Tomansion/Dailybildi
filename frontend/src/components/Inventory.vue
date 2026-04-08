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
          :class="[
            `w${block.blockData.width || 1}`,
            `h${block.blockData.height || 1}`,
            { selected: selectedBlockKey === block.blockCatalogKey },
          ]"
          draggable="true"
          @click="$emit('block-select', block)"
          @dragstart="handleDragStart($event, block)"
          @dragend="handleDragEnd"
        >
          <div class="block-image">
            <img
              :src="block.blockData.imagePath"
              :alt="block.blockCatalogKey"
            />
          </div>
          <div class="block-quantity">{{ block.quantity }}</div>
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

const handleDragStart = (event, block) => {
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData(
    "application/json",
    JSON.stringify({
      imagePath: block.blockData.imagePath,
      blockCatalogKey: block.blockCatalogKey,
      id: block.blockData.id,
      layer: block.blockData.layer,
      rarity: block.blockData.rarity,
    }),
  );
};

const handleDragEnd = () => {
  // Optional: add any cleanup needed after drag ends
};

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
  display: flex;
  flex-direction: column;
  pointer-events: auto;
}

.inventory-header {
  padding: 0.75rem;
}

.inventory-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.block-count {
  margin: 0.25rem 0 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.scroll-area {
  flex: 1;
  overflow-y: auto;
}

.blocks-grid {
  padding: 0.5rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.no-blocks {
  grid-column: 1 / -1;
  padding: 2rem 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.block-card.w1 {
  grid-column: span 1;
}
.block-card.w2 {
  grid-column: span 2;
}
.block-card.w3 {
  grid-column: span 3;
}
.block-card.w4 {
  grid-column: span 4;
}
.block-card.w5 {
  grid-column: span 5;
}

.block-card.h1 {
  grid-row: span 1;
}
.block-card.h2 {
  grid-row: span 2;
}
.block-card.h3 {
  grid-row: span 3;
}
.block-card.h4 {
  grid-row: span 4;
}
.block-card.h5 {
  grid-row: span 5;
}

.block-card {
  position: relative;
  cursor: pointer;
  margin-bottom: 0.25rem;
  background-color: var(--border);
  border-radius: 0.25rem;
  padding: 0.25rem;
}

.block-card:hover {
  transform: scale(1.05);
}

.block-card.selected {
  transform: scale(1.05);
  border: 1px solid red;
}

.block-image {
  justify-content: center;
  display: flex;
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
  overflow: hidden;
}

.block-image img {
  width: 100%;
  object-fit: contain;
}

.block-quantity {
  position: absolute;
  top: 0;
  right: 0;
  width: 1rem;
  height: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(30%, -30%);
  color: var(--text-secondary);
  font-size: 0.65rem;
  font-weight: 600;
  background-color: black;
  color: white;
  padding: 0.1rem 0.3rem;
  border-radius: 9999px;
}

.inventory-footer {
  padding: 0.75rem;
}

.timer-label {
  margin: 0 0 0.25rem 0;
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.timer {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: monospace;
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .inventory-container {
    width: 100%;
    height: inherit;
  }

  .blocks-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}
</style>
