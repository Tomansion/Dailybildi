/**
 * URL utilities for constructing backend URLs
 */

// Get the backend base URL (same domain, no /api prefix)
export function getBackendUrl(path = '') {
  // If path starts with /, use it as-is
  // Otherwise, add a / prefix
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  
  // In development, the frontend runs on localhost:5173 or :3000
  // The backend runs on localhost:8000
  // We use the same protocol and domain as the frontend, but backend port
  
  // For simplicity, we can determine backend URL from the current location
  // If on localhost:5173 (Vite) or localhost:3000 (dev server), use localhost:8000
  // In production, it would be the same domain
  
  const currentHost = window.location.hostname
  const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1'
  
  if (isLocalhost) {
    // Development: construct backend URL manually
    return `http://localhost:8000${normalizedPath}`
  } else {
    // Production: use same domain as frontend
    return `${window.location.protocol}//${currentHost}${normalizedPath}`
  }
}

/**
 * Get the full URL for a tileset image
 * @param {string} imagePath - Relative path like "univers/ink_castle/tiles/tile_0_0_1.png"
 * @returns {string} Full URL to the image
 */
export function getTileImageUrl(imagePath) {
  return getBackendUrl(imagePath)
}

export default {
  getBackendUrl,
  getTileImageUrl
}
