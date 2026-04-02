<template>
  <div id="app">
    <nav class="navbar">
      <div class="nav-container">
        <router-link to="/" class="nav-brand">Dailybildi</router-link>
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
            <router-link to="/canvas" class="nav-link">Canvas</router-link>
          </li>
          <li v-if="isAuthenticated" class="nav-item">
            <router-link to="/community" class="nav-link">Community</router-link>
          </li>
          <li v-if="isAuthenticated" class="nav-item">
            <button @click="logout" class="nav-link logout-btn">Logout</button>
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
  background-color: #1a1a1a;
  padding: 1rem 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand {
  font-size: 1.5rem;
  font-weight: bold;
  color: #fff;
  text-decoration: none;
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
  color: #fff;
  text-decoration: none;
  transition: color 0.3s;
}

.nav-link:hover {
  color: #64748b;
}

.logout-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
}

.main-content {
  padding: 2rem 1rem;
}
</style>
