// Game constants (defaults, can be overridden by universe config)
export const BLOCK_SIZE = 64 // pixels (default, use universe config.blockSize)
export const CAMERA_BOUNDS = 10000 // ±10000 grid units
export const INITIAL_BLOCKS_COUNT = 30
export const DAILY_BLOCKS_COUNT = 10

// Universe
export const UNIVERSE_ID = 'ink_castle'
export const UNIVERSE_CONFIG_PATH = `/univers/${UNIVERSE_ID}/config.json`
export const TILES_PATH = `/univers/${UNIVERSE_ID}/tiles/`

// Rarity weights (lower rarity = higher weight)
export const RARITY_WEIGHTS: Record<number, number> = {
  0: 10,
  1: 9,
  2: 8,
  3: 7,
  4: 6,
  5: 5,
  6: 4,
  7: 3,
  8: 2,
}
