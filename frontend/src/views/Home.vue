<template>
  <div class="home-container">
    <div class="hero">
      <h1>Dailybildi</h1>
      <p>A daily drawing experience where you build with limited blocks</p>
      <div class="hero-buttons" v-if="!isAuthenticated">
        <router-link to="/register" class="btn btn-primary">Get Started</router-link>
        <router-link to="/login" class="btn btn-secondary">Login</router-link>
      </div>
      <div class="hero-buttons" v-else>
        <router-link to="/canvas" class="btn btn-primary">Go to Canvas</router-link>
        <router-link to="/community" class="btn btn-secondary">View Community</router-link>
      </div>
    </div>

    <div class="features">
      <div class="feature card">
        <h3>Daily Blocks</h3>
        <p>Get 10 random blocks every day at 00:00 UTC</p>
      </div>
      <div class="feature card">
        <h3>Infinite Canvas</h3>
        <p>Build your creation on an infinite grid with layers and transformations</p>
      </div>
      <div class="feature card">
        <h3>Community</h3>
        <p>Share your creations and like other players' artwork</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
}

.hero {
  text-align: center;
  padding: 4rem 2rem;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-radius: 1rem;
  margin-bottom: 4rem;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero p {
  font-size: 1.25rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.hero-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.375rem;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s;
  border: none;
  cursor: pointer;
  display: inline-block;
}

.btn-primary {
  background-color: var(--primary);
  color: white;
}

.btn-primary:hover {
  background-color: var(--primary-dark);
  transform: translateY(-2px);
}

.btn-secondary {
  background-color: var(--surface);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 4rem;
}

.feature {
  text-align: center;
  padding: 2rem;
}

.feature h3 {
  margin-bottom: 1rem;
  color: var(--primary);
}

.feature p {
  color: var(--text-secondary);
}
</style>
