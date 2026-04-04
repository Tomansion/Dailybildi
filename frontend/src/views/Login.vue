<template>
  <div class="auth-container">
    <BaseCard class="auth-card">
      <h2>Login</h2>
      <form @submit.prevent="handleLogin" class="auth-form">
        <BaseInput
          v-model="form.username"
          label="Username"
          type="text"
          placeholder="Enter your username"
          required
        />

        <BaseInput
          v-model="form.password"
          label="Password"
          type="password"
          placeholder="Enter your password"
          required
        />

        <div v-if="error" class="form-error">{{ error }}</div>

        <BaseButton
          type="submit"
          variant="primary"
          :disabled="loading"
          class="submit-button"
        >
          {{ loading ? 'Logging in...' : 'Login' }}
        </BaseButton>
      </form>

      <p class="auth-footer">
        Don't have an account?
        <router-link to="/register" class="auth-link">Register here</router-link>
      </p>
    </BaseCard>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'
import BaseCard from '../components/base/BaseCard.vue'
import BaseInput from '../components/base/BaseInput.vue'
import BaseButton from '../components/base/BaseButton.vue'

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
    router.push('/')
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
  font-size: 1.75rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.form-error {
  color: var(--error);
  font-size: 0.85rem;
  padding: 0.5rem;
  border: 1px solid var(--error);
  border-radius: 0;
  background-color: rgba(211, 47, 47, 0.05);
}

.submit-button {
  width: 100%;
}

.auth-footer {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.auth-link {
  color: var(--text-primary);
  border-bottom: 1px solid var(--text-primary);
}

.auth-link:hover {
  opacity: 0.7;
}
</style>
