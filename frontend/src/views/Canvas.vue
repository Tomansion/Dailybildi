<template>
  <div class="canvas-container">
    <Inventory
      :blocks="inventoryBlocks"
      :selectedBlockKey="selectedBlockForPlacement?.blockCatalogKey || null"
      @block-select="handleBlockSelect"
    />

    <div class="canvas-content">
      <div
        id="phaser-container"
        class="phaser-container"
        @dragover="handleDragOver"
        @drop="handleDropBlock"
        @dragleave="handleDragLeave"
      ></div>

      <BlockActionButtons
        :hasSelectedBlock="hasSelectedBlock || isInPlacementMode"
        @rotate="handleRotate"
        @flip-horizontal="handleFlipHorizontal"
        @flip-vertical="handleFlipVertical"
        @discard="handleDiscard"
        @zoom-in="handleZoomIn"
        @zoom-out="handleZoomOut"
      />
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { useInventoryStore } from "../stores/inventory";
import { getTileImageUrl } from "../services/urls";
import { PhaserGameWrapper } from "../phaser/PhaserGame";
import Inventory from "../components/Inventory.vue";
import BlockActionButtons from "../components/BlockActionButtons.vue";

const route = useRoute();
const inventoryStore = useInventoryStore();

const loading = ref(true);
const error = ref(null);
const hasSelectedBlock = ref(false);
const selectedBlockForPlacement = ref(null);

let phaserGame = null;
let mainScene = null;

const isInPlacementMode = computed(() => !!selectedBlockForPlacement.value);

const inventoryBlocks = computed(() => {
  const blocks = inventoryStore.inventory?.blocks || [];
  return blocks.map((block) => ({
    blockCatalogKey: block.block_id,
    quantity: block.quantity,
    blockData: {
      id: block.block_catalog_id,
      layer: block.layer,
      rarity: block.rarity,
      imagePath: getTileImageUrl(block.image_path),
      width: block.width,
      height: block.height,
    },
  }));
});

const goHome = () => {
  if (mainScene) {
    mainScene.goHome();
  }
};

const handleBlockSelect = (block) => {
  // Toggle - if clicking the same block again, deselect
  if (
    selectedBlockForPlacement.value?.blockCatalogKey === block.blockCatalogKey
  ) {
    cancelBlockPlacement();
    return;
  }

  selectedBlockForPlacement.value = {
    imagePath: block.blockData.imagePath,
    blockCatalogKey: block.blockCatalogKey,
    id: block.blockData.id,
    layer: block.blockData.layer,
    rarity: block.blockData.rarity,
  };

  if (mainScene) {
    mainScene.selectBlockForPlacement(selectedBlockForPlacement.value);
  }
};

const handleDragOver = (event) => {
  // Prevent default to allow drop
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  // Optional: add visual feedback
  event.target.classList.add("drag-over");
};

const handleDragLeave = (event) => {
  // Remove visual feedback when dragging leaves
  if (event.target.id === "phaser-container") {
    event.target.classList.remove("drag-over");
  }
};

const handleDropBlock = async (event) => {
  event.preventDefault();
  event.target.classList.remove("drag-over");

  try {
    // Extract block data from dataTransfer
    const blockDataJson = event.dataTransfer.getData("application/json");
    if (!blockDataJson) {
      return;
    }

    const blockData = JSON.parse(blockDataJson);

    // Get position relative to the phaser container (not viewport)
    const phaserContainer = document.getElementById("phaser-container");
    const rect = phaserContainer.getBoundingClientRect();
    const pointer = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    // Call the Phaser method to place block at drop position
    if (mainScene) {
      mainScene.placeBlockAtDropPosition(blockData, pointer);
    }
  } catch (err) {
    console.error("Failed to process block drop:", err);
  }
};

const cancelBlockPlacement = () => {
  selectedBlockForPlacement.value = null;
  if (mainScene) {
    mainScene.cancelBlockPlacement();
  }
};

const handleRotate = () => {
  if (mainScene) {
    if (isInPlacementMode.value) {
      mainScene.rotatePhantomBlock();
    } else {
      mainScene.rotateSelectedBlock();
    }
  }
};

const handleFlipHorizontal = () => {
  if (mainScene) {
    if (isInPlacementMode.value) {
      mainScene.flipPhantomBlockHorizontal();
    } else {
      mainScene.flipSelectedBlockHorizontal();
    }
  }
};

const handleFlipVertical = () => {
  if (mainScene) {
    if (isInPlacementMode.value) {
      mainScene.flipPhantomBlockVertical();
    } else {
      mainScene.flipSelectedBlockVertical();
    }
  }
};

const handleDiscard = () => {
  if (mainScene) {
    if (isInPlacementMode.value) {
      cancelBlockPlacement();
    } else {
      mainScene.removeSelectedBlock();
      hasSelectedBlock.value = false;
    }
  }
};

const handleZoomIn = () => {
  if (mainScene) mainScene.zoomIn();
};

const handleZoomOut = () => {
  if (mainScene) mainScene.zoomOut();
};

const selectNextBlock = (direction = 1) => {
  if (inventoryBlocks.value.length === 0 || !selectedBlockForPlacement.value) {
    return;
  }

  // Find the current block index
  const currentIndex = inventoryBlocks.value.findIndex(
    (block) =>
      block.blockCatalogKey === selectedBlockForPlacement.value.blockCatalogKey,
  );

  // Get the next block (with wrapping) - direction: 1 for forward, -1 for backward
  const nextIndex =
    (currentIndex + direction + inventoryBlocks.value.length) %
    inventoryBlocks.value.length;
  const nextBlock = inventoryBlocks.value[nextIndex];

  if (nextBlock) {
    handleBlockSelect(nextBlock);
  }
};

const handleKeyDown = (event) => {
  if (event.key === "Tab" && selectedBlockForPlacement.value) {
    event.preventDefault();
    const direction = event.shiftKey ? -1 : 1;
    selectNextBlock(direction);
  }
};

onMounted(async () => {
  try {
    // Fetch user's inventory
    await inventoryStore.fetchInventory();

    // Fetch placed blocks
    const placedBlocks = await inventoryStore.fetchWorldBlocks();

    // Initialize Phaser game
    phaserGame = new PhaserGameWrapper();
    mainScene = await phaserGame.initialize("phaser-container");

    if (!mainScene) {
      error.value = "Failed to initialize game";
      loading.value = false;
      return;
    }

    // Collect all block images to load (from both inventory and placed blocks)
    // Use a Map to deduplicate by block catalog id
    const blockImageMap = new Map();

    // Add inventory blocks
    inventoryBlocks.value.forEach((block) => {
      blockImageMap.set(block.blockData.id, {
        id: block.blockData.id,
        layer: block.blockData.layer,
        rarity: block.blockData.rarity,
        imagePath: block.blockData.imagePath,
      });
    });

    // Add placed blocks (they may not be in inventory anymore)
    placedBlocks.forEach((block) => {
      if (!blockImageMap.has(block.blockData.id)) {
        blockImageMap.set(block.blockData.id, {
          id: block.blockData.id,
          layer: block.blockData.layer,
          rarity: block.blockData.rarity,
          imagePath: block.blockData.imagePath,
        });
      }
    });

    const allBlockImages = Array.from(blockImageMap.values());

    // Setup keyboard shortcuts
    window.addEventListener("keydown", handleKeyDown);

    // Setup callbacks
    mainScene.setOnBlockPlaced(
      async (blockCatalogKey, gridX, gridY, transformations) => {
        try {
          await inventoryStore.placeBlock(
            blockCatalogKey,
            gridX,
            gridY,
            transformations,
          );
          // Reload inventory and blocks
          await inventoryStore.fetchInventory();
          const updated = await inventoryStore.fetchWorldBlocks();

          // Check if the block type is still in inventory
          const blockStillInInventory = inventoryBlocks.value.some(
            (block) =>
              block.blockCatalogKey === blockCatalogKey && block.quantity > 0,
          );

          if (updated && mainScene) {
            mainScene.loadBlocks(updated);
            // Only select the placed block if it's the last one (no more in inventory)
            // Otherwise keep phantom active for quick repeated placement
            if (!blockStillInInventory && updated.length > 0) {
              const lastBlock = updated[updated.length - 1];
              mainScene.selectBlockByKey(lastBlock.blockKey);
              hasSelectedBlock.value = true;
            }
          }

          // Only cancel placement if the block is no longer in inventory
          if (!blockStillInInventory) {
            cancelBlockPlacement();
          }
          // Otherwise keep phantom active for placing more of the same type
        } catch (err) {
          console.error("Failed to place block:", err);
        }
      },
    );

    mainScene.setOnBlockSelected((blockKey) => {
      hasSelectedBlock.value = true;
    });

    mainScene.setOnBlockDeselected(() => {
      hasSelectedBlock.value = false;
    });

    mainScene.setOnBlockPlacementCancelled(() => {
      selectedBlockForPlacement.value = null;
    });

    mainScene.setOnBlockUpdated(async (blockKey, updates) => {
      try {
        if (updates.removed) {
          await inventoryStore.removeBlock(blockKey);
          // Reload inventory when block is removed
          await inventoryStore.fetchInventory();
        } else {
          await inventoryStore.updateBlock(blockKey, updates);
        }
      } catch (err) {
        console.error("Failed to update block:", err);
      }
    });

    // Load images first, then blocks
    if (allBlockImages.length > 0) {
      mainScene.loadBlockImages(allBlockImages, () => {
        mainScene.loadBlocks(placedBlocks);
      });
    } else {
      mainScene.loadBlocks(placedBlocks);
    }

    loading.value = false;
  } catch (err) {
    error.value = "Failed to load canvas: " + (err.message || "Unknown error");
    console.error(err);
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  // Clean up keyboard listener
  window.removeEventListener("keydown", handleKeyDown);

  if (phaserGame) {
    phaserGame.destroy();
    phaserGame = null;
    mainScene = null;
  }
});
</script>

<style scoped>
.canvas-container {
  height: 100%;
  display: flex;
  overflow: hidden;
}

.canvas-header {
  padding: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.canvas-header h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
}

.phaser-container.drag-over {
  background-color: rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.canvas-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  margin: 10px;
  margin-bottom: 0px;
}

.phaser-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid var(--border);
}

.loading,
.error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 2rem;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0;
  z-index: 500;
  text-align: center;
}

.loading {
  color: var(--text-secondary);
}

.error-message {
  color: var(--error);
  border-color: var(--error);
}

@media (max-width: 768px) {
  .canvas-container {
    flex-direction: column-reverse;
  }
}
</style>
