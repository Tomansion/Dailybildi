<template>
  <div class="auth-container">
    <div class="auth-card card">
      <h1>Login</h1>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username" class="form-label">Username</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            required
            placeholder="Enter your username"
          />
        </div>

        <div class="form-group">
          <label for="password" class="form-label">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            placeholder="Enter your password"
          />
        </div>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>

        <div v-if="error" class="error">{{ error }}</div>
      </form>

      <p class="auth-footer">
        Don't have an account? <router-link to="/register">Register</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  username: '',
  password: ''
})

const loading = ref(false)
const error = ref(null)

const handleLogin = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await api.post('/auth/login', {
      username: form.value.username,
      password: form.value.password
    })

    authStore.setAuth(response.data.access_token, response.data.user)
    router.push('/canvas')
  } catch (err) {
    error.value = err.response?.data?.detail || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.auth-card {
  width: 100%;
  max-width: 400px;
}

.auth-card h1 {
  margin-bottom: 2rem;
  text-align: center;
}

.auth-footer {
  text-align: center;
  margin-top: 2rem;
  color: var(--text-secondary);
}

.auth-footer a {
  color: var(--primary);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
