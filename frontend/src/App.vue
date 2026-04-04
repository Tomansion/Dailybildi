<template>
  <div id="app">
    <nav class="navbar">
      <div class="nav-container">
          <router-link to="/" class="nav-brand">
            <img src="/icons/logo.svg" alt="Dailybildi" class="nav-logo" />
            Dailybildi</router-link>
        <ul class="nav-menu">
          <li v-if="!isAuthenticated" class="nav-item">
            <router-link to="/login" class="nav-link">Login</router-link>
          </li>
          <li v-if="!isAuthenticated" class="nav-item">
            <router-link to="/register" class="nav-link">Register</router-link>
          </li>
          <li v-if="isAuthenticated" class="nav-item">
            <router-link to="/" class="nav-link">Universes</router-link>
          </li>
          <li v-if="isAuthenticated" class="nav-item">
            <router-link to="/community" class="nav-link">Community</router-link>
          </li>
          <li v-if="isAuthenticated" class="nav-item">
            <button @click="logout" class="nav-logout">Logout</button>
          </li>
        </ul>
      </div>
    </nav>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from './stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const isAuthenticated = computed(() => authStore.isAuthenticated)

const logout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.navbar {
  background-color: var(--background);
  padding: 1rem 0;
  border-bottom: 1px solid var(--border);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-logo {
  height: 32px;
  width: 32px;
  object-fit: contain;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.5rem;
  font-weight: 700;
  text-decoration: none;
  border: none;
  cursor: pointer;
  letter-spacing: -1px;
}

.nav-brand:hover {
  opacity: 1;
}

.nav-menu {
  list-style: none;
  display: flex;
  gap: 2rem;
  margin: 0;
  padding: 0;
}

.nav-item {
  display: flex;
  align-items: center;
}

.nav-link {
  color: var(--text-primary);
  text-decoration: none;
  border: none;
  font-weight: 500;
  transition: opacity 0.2s;
  padding: 0.25rem 0;
}

.nav-link:hover {
  opacity: 0.7;
}

.nav-logout {
  background-color: transparent;
  color: var(--text-primary);
  border: 1px solid var(--text-primary);
  padding: 0.25rem 0.75rem;
  font-size: 0.9rem;
}

.nav-logout:hover {
  background-color: var(--text-primary);
  color: var(--background);
}

.main-content {
  flex: 1;
  background-color: var(--background);
}
</style>
