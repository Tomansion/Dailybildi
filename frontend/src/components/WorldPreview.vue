<template>
  <div class="world-preview-wrapper">
    <canvas
      ref="canvas"
      class="world-preview-canvas"
      :width="canvasWidth"
      :height="canvasHeight"
    ></canvas>
    <div v-if="isEmpty" class="world-preview-empty">No blocks</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { getTileImageUrl } from "../services/urls";

const props = defineProps({
  world: {
    type: Object,
    required: true,
    // Should have: { placed_blocks: [...] }
  },
  universeConfig: {
    type: Object,
    required: true,
    // Should have: { backgroundColor, blockSize }
  },
  canvasWidth: {
    type: Number,
    default: 280,
  },
  canvasHeight: {
    type: Number,
    default: 200,
  },
  padding: {
    type: Number,
    default: 8,
  },
});

const canvas = ref(null);
const imageCache = new Map();
const isEmpty = computed(
  () => !props.world?.placed_blocks || props.world.placed_blocks.length === 0,
);

/**
 * Load image with caching
 */
async function loadImage(imagePath) {
  if (imageCache.has(imagePath)) {
    return imageCache.get(imagePath);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(imagePath, img);
      resolve(img);
    };
    img.onerror = () => {
      // Return a placeholder canvas drawing
      const canvas = document.createElement("canvas");
      canvas.width = props.universeConfig.blockSize;
      canvas.height = props.universeConfig.blockSize;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#cccccc";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#999999";
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
      imageCache.set(imagePath, canvas);
      resolve(canvas);
    };
    img.src = imagePath;
  });
}

/**
 * Calculate bounding box of all placed blocks
 * Returns { minX, maxX, minY, maxY, width, height }
 */
function calculateBoundingBox() {
  if (!props.world?.placed_blocks?.length) {
    return null;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const block of props.world.placed_blocks) {
    minX = Math.min(minX, block.grid_x);
    maxX = Math.max(maxX, block.grid_x + (block.width || 1) - 1);
    minY = Math.min(minY, block.grid_y);
    maxY = Math.max(maxY, block.grid_y + (block.height || 1) - 1);
  }

  const worldWidth = (maxX - minX + 1) * props.universeConfig.blockSize;
  const worldHeight = (maxY - minY + 1) * props.universeConfig.blockSize;

  return { minX, maxX, minY, maxY, width: worldWidth, height: worldHeight };
}

/**
 * Calculate canvas offset and scale to center the world with smart alignment
 * If wider: align to top, center horizontally
 * If taller: align to left, center vertically
 */
function calculateLayout(bbox) {
  if (!bbox) return { offsetX: 0, offsetY: 0, scale: 1 };

  const availableWidth = props.canvasWidth - 2 * props.padding;
  const availableHeight = props.canvasHeight - 2 * props.padding;

  const scale = Math.min(
    availableWidth / bbox.width,
    availableHeight / bbox.height,
  );

  const scaledWidth = bbox.width * scale;
  const scaledHeight = bbox.height * scale;

  let offsetX = props.padding;
  let offsetY = props.padding;

  // Taller world: left-align, center vertically
  offsetX = 0.5 * (props.canvasWidth - scaledWidth);
  offsetY = 0.5 * (props.canvasHeight - scaledHeight);

  return { offsetX, offsetY, scale };
}

/**
 * Draw a block on canvas with transformations
 */
async function drawBlock(ctx, block, bbox, offsetX, offsetY, scale) {
  const imagePath = getTileImageUrl(block.image_path);
  const image = await loadImage(imagePath);

  if (!image) return;

  // Calculate position in canvas space
  const gridX = block.grid_x - bbox.minX;
  const gridY = block.grid_y - bbox.minY;

  const x =
    offsetX +
    (gridX - (block.width || 1) * 2) * props.universeConfig.blockSize * scale;
  const y =
    offsetY +
    (gridY - (block.height || 1) * 2) * props.universeConfig.blockSize * scale;

  const blockWidth =
    (block.width || 1) *
      props.universeConfig.blockSize *
      props.universeConfig.worldImageScale *
      8 *
      scale +
    1;
  const blockHeight =
    (block.height || 1) *
      props.universeConfig.blockSize *
      props.universeConfig.worldImageScale *
      8 *
      scale +
    1;

  // Save context state
  ctx.save();

  // Move to center of block for rotation
  ctx.translate(x + blockWidth / 2, y + blockHeight / 2);

  // Apply rotation
  if (block.rotation) {
    ctx.rotate((block.rotation * Math.PI) / 180);
  }

  // Apply flips
  if (block.flip_x) ctx.scale(-1, 1);
  if (block.flip_y) ctx.scale(1, -1);

  // Draw image centered
  ctx.drawImage(
    image,
    -blockWidth / 2,
    -blockHeight / 2,
    blockWidth,
    blockHeight,
  );

  // Restore context
  ctx.restore();
}

/**
 * Render the preview
 */
async function renderPreview() {
  if (!canvas.value) return;

  const ctx = canvas.value.getContext("2d");
  if (!ctx) return;

  // Disable anti-aliasing for crisp pixel art
  ctx.imageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;

  // Clear and fill background
  ctx.fillStyle = props.universeConfig.backgroundColor || "#f5f5f5";
  ctx.fillRect(0, 0, props.canvasWidth, props.canvasHeight);

  if (isEmpty.value) return;

  const bbox = calculateBoundingBox();
  if (!bbox) return;

  const { offsetX, offsetY, scale } = calculateLayout(bbox);

  // Sort blocks by depth (layer * 1000 + z_order)
  const sortedBlocks = [...props.world.placed_blocks].sort(
    (a, b) =>
      (a.layer || 0) * 1000 +
      (a.z_order || 0) -
      ((b.layer || 0) * 1000 + (b.z_order || 0)),
  );

  // Draw blocks
  for (const block of sortedBlocks) {
    await drawBlock(ctx, block, bbox, offsetX, offsetY, scale);
  }
}

onMounted(() => {
  renderPreview();
});

onBeforeUnmount(() => {
  // Clear image cache
  imageCache.clear();
});
</script>

<style scoped>
.world-preview-wrapper {
  position: relative;
  display: inline-block;
}

.world-preview-canvas {
  display: block;
  background-color: var(--surface);
  border-radius: 0;
  width: 100%;
  height: auto;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  border-bottom: 3px solid var(--border);
}

.world-preview-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text-secondary);
  font-size: 0.85rem;
  text-align: center;
  pointer-events: none;
}
</style>
