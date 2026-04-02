// Game constants
export const BLOCK_SIZE = 64
export const CAMERA_BOUNDS = 5000

// Universe configuration
export const UNIVERSE_ID = 'ink_castle' // This should match your universe

// Get backend URL for serving static files
export function getBackendUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:8000'
  }
  
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  
  if (isLocalhost) {
    // Development: use localhost:8000 for backend
    return 'http://localhost:8000'
  } else {
    // Production: use same domain as frontend
    return `${window.location.protocol}//${window.location.hostname}`
  }
}

export function getUniverseConfigPath() {
  return `${getBackendUrl()}/univers/${UNIVERSE_ID}/config.json`
}
