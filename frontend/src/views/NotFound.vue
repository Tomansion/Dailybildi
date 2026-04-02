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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.not-found-content {
  text-align: center;
  background: white;
  padding: 4rem 2rem;
  border-radius: 1rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 500px;
}

.error-code {
  font-size: 5rem;
  font-weight: 900;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 1rem 0;
  line-height: 1;
}

h1 {
  font-size: 2rem;
  color: #2d3748;
  margin: 0.5rem 0 1rem 0;
}

.error-message {
  font-size: 1.1rem;
  color: #718096;
  margin: 1rem 0 2rem 0;
  line-height: 1.6;
}

.home-link {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-decoration: none;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}

.home-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
}

.home-link:active {
  transform: translateY(0);
}
</style>
