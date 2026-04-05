import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: () => import('./views/Landing.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/universes',
    name: 'Universes',
    component: () => import('./views/Universes.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('./views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('./views/Register.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/canvas',
    name: 'Canvas',
    component: () => import('./views/Canvas.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/community',
    name: 'Community',
    component: () => import('./views/Community.vue')
  },
  {
    path: '/community/:worldId',
    name: 'WorldView',
    component: () => import('./views/WorldView.vue')
  },
  {
    path: '/universe-contribution',
    name: 'UniverseContribution',
    component: () => import('./views/UniverseContribution.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('./views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if ((to.name === 'Login' || to.name === 'Register') && authStore.isAuthenticated) {
    next('/universes')
  } else {
    next()
  }
})

export default router
