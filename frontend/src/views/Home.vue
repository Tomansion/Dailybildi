<template>
  <div class="home-container">
    <section class="hero">
      <h1>Dailybildi</h1>
      <p class="hero-subtitle">A daily drawing experience where you build with limited blocks</p>
      <div class="hero-buttons" v-if="!isAuthenticated">
        <router-link to="/register" class="button-link">Get Started</router-link>
        <router-link to="/login" class="button-link secondary">Login</router-link>
      </div>
      <div class="hero-buttons" v-else>
        <router-link to="/community" class="button-link secondary">View Community</router-link>
      </div>
    </section>

    <section class="features">
      <BaseCard v-for="feature in features" :key="feature.id" class="feature-card">
        <h3>{{ feature.title }}</h3>
        <p>{{ feature.description }}</p>
      </BaseCard>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import BaseCard from '../components/base/BaseCard.vue'

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)

const features = [
  {
    id: 1,
    title: 'Daily Blocks',
    description: 'Get 10 random blocks every day at 00:00 UTC'
  },
  {
    id: 2,
    title: 'Infinite Canvas',
    description: 'Build your creation on an infinite grid with layers and transformations'
  },
  {
    id: 3,
    title: 'Community',
    description: 'Share your creations and like other players\' artwork'
  }
]
</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
}

.hero {
  text-align: center;
  padding: 4rem 2rem;
  margin-bottom: 4rem;
  border: 1px solid var(--border);
  background-color: var(--surface);
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
  letter-spacing: -2px;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.hero-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.button-link {
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  font-weight: 500;
  border: 1px solid var(--text-primary);
  background-color: var(--text-primary);
  color: var(--background);
  display: inline-block;
  transition: all 0.2s;
  border-radius: 0;
  cursor: pointer;
}

.button-link:hover {
  opacity: 0.8;
  background-color: var(--text-secondary);
  border-color: var(--text-secondary);
}

.button-link.secondary {
  background-color: transparent;
  color: var(--text-primary);
}

.button-link.secondary:hover {
  background-color: var(--text-primary);
  color: var(--background);
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.feature-card {
  padding: 1.5rem;
}

.feature-card h3 {
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
}

.feature-card p {
  font-size: 0.95rem;
  line-height: 1.6;
}
</style>
