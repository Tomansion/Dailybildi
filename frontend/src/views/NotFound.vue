<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <div class="error-code">404</div>
      <h1>Page Not Found</h1>
      <p class="error-message">Sorry, the page you're looking for doesn't exist.</p>
      <router-link to="/" class="home-link">
        ← Back to Home
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

// Log the attempted navigation for debugging
onMounted(() => {
  console.warn(`User tried to access non-existent route: ${window.location.pathname}`)
})
</script>

<style scoped>
.not-found-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--background);
  padding: 1rem;
}

.not-found-content {
  text-align: center;
  background-color: var(--surface);
  padding: 3rem 2rem;
  border: 1px solid var(--border);
  border-radius: 0;
  max-width: 500px;
}

.error-code {
  font-size: 4.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
  line-height: 1;
  letter-spacing: -2px;
}

h1 {
  font-size: 1.75rem;
  color: var(--text-primary);
  margin: 0.5rem 0 1rem 0;
  letter-spacing: -1px;
}

.error-message {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 1rem 0 2rem 0;
  line-height: 1.6;
}

.home-link {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background-color: var(--text-primary);
  color: var(--background);
  text-decoration: none;
  border: 1px solid var(--text-primary);
  border-radius: 0;
  font-weight: 600;
  transition: all 0.2s;
  cursor: pointer;
}

.home-link:hover {
  background-color: var(--background);
  color: var(--text-primary);
  opacity: 0.8;
}
</style>
