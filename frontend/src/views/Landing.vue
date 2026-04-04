<template>
  <div class="landing-container">
    <!-- Left Side - Concept -->
    <div class="landing-left">
      <div class="landing-content">
        <h1>DailyBildi</h1>
        <p class="subtitle">Build block by block as days go by</p>
        
        <div class="concept">
          <div class="concept-item">
            <div class="concept-header">
              <img src="/icons/blocks.svg" alt="Blocks" class="concept-icon" />
              <h3>New Blocks Every Day</h3>
            </div>
            <p>Receive 10 unique blocks at 00:00. Everyone gets the same blocks on the same day, but you create your own unique masterpiece.</p>
          </div>
          
          <div class="concept-item">
            <div class="concept-header">
              <img src="/icons/bricks.svg" alt="Bricks" class="concept-icon" />
              <h3>Place & Build</h3>
            </div>
            <p>Place blocks on an infinite canvas following a grid. Rotate and flip your blocks, your creation grows day by day.</p>
          </div>
          
          <div class="concept-item">
            <div class="concept-header">
              <img src="/icons/heart.svg" alt="Community" class="concept-icon" />
              <h3>Community</h3>
            </div>
            <p>View other creators' worlds, like their creations, and see what others are building.</p>
          </div>
          
          <div class="concept-item">
            <div class="concept-header">
              <img src="/icons/logo.svg" alt="Universes" class="concept-icon" />
              <h3>Multiple Universes</h3>
            </div>
            <p>Build in different universes with unique aesthetics – from medieval castles to sci-fi landscapes, each with its own block catalog.</p>
          </div>

          <div class="concept-item">
            <div class="concept-header">
              <img src="/icons/bird.svg" alt="Open Source" class="concept-icon" />
              <h3>Free and Open Source</h3>
            </div>
            <p>Built with open source technologies. Everyone can contribute and help shape the future of DailyBildi.</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Right Side - Action Buttons -->
    <div class="landing-right">
      <div class="blocks-animation">
        <div 
          v-for="block in blocks" 
          :key="block.id"
          class="block"
          :class="[`block-${block.shape}`, { 'block-visible': block.visible }]"
          :style="{ 
            left: `${block.x}px`,
            top: `${block.y}px`,
            animationDelay: `${block.delay}ms`,
            '--block-size': `${blockSize}px`
          }"
        />
      </div>
      <div class="landing-actions">
        <div class="action-card">
          <div class="card-content">
            <h2>Get Started</h2>
            <p>Join the daily building community</p>
            
            <div class="button-group">
              <router-link to="/login" class="action-button login-button">
                Login
              </router-link>
              <router-link to="/register" class="action-button register-button">
                Create Account
              </router-link>
              <router-link to="/community">
                Explore Community
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const blocks = ref([])
let blockSize = 42
const gridSizeRows = 20

const handleResize = async () => {
  await nextTick()
  createBlocks()
}

const shapes = ['square', 'circle', 'triangle', 'right-triangle-right', 'right-triangle-down', 'right-triangle-left', 'right-triangle-up']

const createBlocks = () => {
  const container = document.querySelector('.blocks-animation')
  if (!container) return
  
  const containerWidth = container.parentElement.offsetWidth
  const containerHeight = container.parentElement.offsetHeight
  
  // Calculate grid columns dynamically based on aspect ratio
  const gridSizeCols = Math.ceil((containerWidth / containerHeight) * gridSizeRows)
  
  // Calculate block size to fill the container while maintaining fixed grid
  const blockSizeWidth = containerWidth / gridSizeCols
  const blockSizeHeight = containerHeight / gridSizeRows
  blockSize = Math.min(blockSizeWidth, blockSizeHeight)
  
  const positions = []
  
  // Create grid positions
  for (let row = 0; row < gridSizeRows; row++) {
    for (let col = 0; col < gridSizeCols; col++) {
      positions.push({ row, col })
    }
  }
  
  // Start from bottom-left, spread upward and right
  const visited = new Set()
  const queue = [{ row: gridSizeRows - 1, col: 0 }]
  visited.add(`${gridSizeRows - 1},0`)
  
  const blocksList = []
  let delay = 0
  const baseDelay = 4
  
  while (queue.length > 0) {
    const current = queue.shift()
    const shape = shapes[Math.floor(Math.random() * shapes.length)]
    
    blocksList.push({
      id: `${current.row}-${current.col}`,
      x: current.col * blockSize + blockSize / 2,
      y: current.row * blockSize + blockSize / 2,
      shape,
      visible: false,
      delay
    })
    
    delay += baseDelay
    
    // Add adjacent positions
    const directions = [
      { row: current.row - 1, col: current.col },
      { row: current.row + 1, col: current.col },
      { row: current.row, col: current.col - 1 },
      { row: current.row, col: current.col + 1 }
    ]
    
    for (const dir of directions) {
      const key = `${dir.row},${dir.col}`
      if (
        dir.row >= 0 && 
        dir.row < gridSizeRows && 
        dir.col >= 0 && 
        dir.col < gridSizeCols && 
        !visited.has(key)
      ) {
        visited.add(key)
        queue.push(dir)
      }
    }
  }
  
  // Fill any remaining unvisited positions
  for (let row = 0; row < gridSizeRows; row++) {
    for (let col = 0; col < gridSizeCols; col++) {
      const key = `${row},${col}`
      if (!visited.has(key)) {
        const shape = shapes[Math.floor(Math.random() * shapes.length)]
        blocksList.push({
          id: key,
          x: col * blockSize,
          y: row * blockSize,
          shape,
          visible: false,
          delay: 0
        })
      }
    }
  }
  
  // Sort blocks from bottom to top for animation order
  blocksList.sort((a, b) => {
    const rowA = parseInt(a.id.split('-')[0])
    const rowB = parseInt(b.id.split('-')[0])
    return rowB - rowA // Bottom rows first (higher row numbers)
  })
  
  // Reassign delays based on bottom-to-top order
  delay = 0
  blocksList.forEach((block) => {
    block.delay = delay
    delay += baseDelay
  })
  
  blocks.value = blocksList
  
  // Animate blocks in
  blocksList.forEach((block) => {
    setTimeout(() => {
      const blockRef = blocks.value.find(b => b.id === block.id)
      if (blockRef) {
        blockRef.visible = true
      }
    }, block.delay)
  })
}

onMounted(async () => {
  await nextTick()
  createBlocks()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.landing-container {
  display: flex;
  height: 100%;
}

@media (max-width: 1024px) {
  .landing-container {
    flex-direction: column;
    height: auto;
  }
}

/* Left Side */
.landing-left {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: var(--background);
}

@media (max-width: 1024px) {
  .landing-right {
    border-left: none;
    border-top: 1px solid var(--border);
    min-height: auto;
  }
}

@media (max-width: 768px) {
  .landing-right {
    padding: 1rem;
  }
}

/* Blocks Animation */
.blocks-animation {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.15;
  pointer-events: none;
}

.block {
  position: absolute;
  opacity: 0;
}

.block-visible {
  animation: popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: translate(0, 200%) scale(0);
  }
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.4;
  }
}

/* Block Shapes */
.block-square {
  width: var(--block-size);
  height: var(--block-size);
  background-color: var(--text-primary);
}

.block-circle {
  width: var(--block-size);
  height: var(--block-size);
  background-color: var(--text-primary);
  border-radius: 50%;
}

.block-triangle {
  width: 0;
  height: 0;
  border-left: calc(var(--block-size) * 0.3) solid transparent;
  border-right: calc(var(--block-size) * 0.3) solid transparent;
  border-bottom: var(--block-size) solid var(--text-primary);
}

/* Right Triangle - 4 Rotations (45-45-90) */
.block-right-triangle-up {
  width: 0;
  height: 0;
  border-left: var(--block-size) solid transparent;
  border-bottom: var(--block-size) solid var(--text-primary);
}

.block-right-triangle-right {
  width: 0;
  height: 0;
  border-top: var(--block-size) solid transparent;
  border-left: var(--block-size) solid var(--text-primary);
}

.block-right-triangle-down {
  width: 0;
  height: 0;
  border-right: var(--block-size) solid transparent;
  border-top: var(--block-size) solid var(--text-primary);
}

.block-right-triangle-left {
  width: 0;
  height: 0;
  border-bottom: var(--block-size) solid transparent;
  border-right: var(--block-size) solid var(--text-primary);
}

.landing-actions {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

@media (max-width: 768px) {
  .landing-content h1 {
    font-size: 2.5rem;
  }
}

.subtitle {
  font-size: 1.25rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.concept {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 2rem;
}

.concept-item {
}

.concept-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.concept-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
}

.concept-item h3 {
  font-size: 1.1rem;
  margin: 0;
  color: var(--text-primary);
}

.concept-item p {
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0;
}

/* Right Side */
.landing-right {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: var(--surface);
  border-left: 1px solid var(--border);
  overflow: hidden;
}

@media (max-width: 1024px) {
  .landing-right {
    border-left: none;
    border-top: 1px solid var(--border);
    min-height: auto;
  }
}

@media (max-width: 768px) {
  .landing-right {
    padding: 1rem;
  }
}

.action-card {
  background-color: var(--background);
  border: 1px solid var(--border);
  padding: 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.card-content {
  position: relative;
  z-index: 1;
}

.action-card h2 {
  margin-top: 0;
  font-size: 1.75rem;
}

.action-card p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  font-size: 1rem;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.action-button {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  display: block;
  border-radius: 0;
  transition: all 0.2s;
  border: 1px solid var(--text-primary);
  cursor: pointer;
}

.login-button {
  background-color: var(--text-primary);
  color: var(--background);
  border-color: var(--text-primary);
}

.login-button:hover {
  opacity: 0.9;
}

.register-button {
  background-color: transparent;
  color: var(--text-primary);
  border-color: var(--text-primary);
}

.register-button:hover {
  background-color: var(--text-primary);
  color: var(--background);
}

</style> 