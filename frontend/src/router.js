import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: () => import('./views/Landing.vue'),
    meta: {
      requiresAuth: false,
      pageTitle: 'Dailybildi - Build Block by Block, One Day at a Time',
      pageDescription: 'A cozy slow-building game where you receive 10 new blocks every day. Create your infinite canvas at your own pace. Join the community and like others\' creations.'
    }
  },
  {
    path: '/universes',
    name: 'Universes',
    component: () => import('./views/Universes.vue'),
    meta: {
      requiresAuth: true,
      pageTitle: 'Universes - Dailybildi',
      pageDescription: 'Explore different universes in Dailybildi. Each universe has its own unique visual theme and block catalog. Choose your favorite universe to build in.'
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('./views/Login.vue'),
    meta: {
      requiresAuth: false,
      pageTitle: 'Login - Dailybildi',
      pageDescription: 'Sign in to your Dailybildi account to continue building your creation.'
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('./views/Register.vue'),
    meta: {
      requiresAuth: false,
      pageTitle: 'Create Account - Dailybildi',
      pageDescription: 'Create a free Dailybildi account to start building. Receive 10 blocks every day to expand your creation.'
    }
  },
  {
    path: '/canvas',
    name: 'Canvas',
    component: () => import('./views/Canvas.vue'),
    meta: {
      requiresAuth: true,
      pageTitle: 'My Canvas - Dailybildi',
      pageDescription: 'Start or continue building your masterpiece. Place, rotate, flip, and layer your blocks freely.'
    }
  },
  {
    path: '/community',
    name: 'Community',
    component: () => import('./views/Community.vue'),
    meta: {
      pageTitle: 'Community - Dailybildi',
      pageDescription: 'Browse creations from the Dailybildi community. Like your favorite builds and get inspired by other players.'
    }
  },
  {
    path: '/community/:worldId',
    name: 'WorldView',
    component: () => import('./views/WorldView.vue'),
    meta: {
      pageTitle: 'Community Creation - Dailybildi',
      pageDescription: 'View and like this Dailybildi creation. See what other players are building every day.'
    }
  },
  {
    path: '/universe-contribution',
    name: 'UniverseContribution',
    component: () => import('./views/UniverseContribution.vue'),
    meta: {
      pageTitle: 'Create a Universe - Dailybildi',
      pageDescription: 'Create your own universe for Dailybildi with custom blocks, background, and theme. Share your universe with the community.'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('./views/NotFound.vue'),
    meta: {
      pageTitle: 'Page Not Found - Dailybildi',
      pageDescription: 'The page you\'re looking for doesn\'t exist. Return to Dailybildi and start building.'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Update document title and meta description based on route
router.afterEach((to) => {
  // Set document title
  const pageTitle = to.meta.pageTitle || 'Dailybildi - Build Block by Block, One Day at a Time'
  document.title = pageTitle
  
  // Update meta description
  const pageDescription = to.meta.pageDescription || 'A cozy slow-building game where you receive 10 new blocks every day.'
  const metaDescription = document.querySelector('meta[name="description"]')
  if (metaDescription) {
    metaDescription.setAttribute('content', pageDescription)
  }
  
  // Update OG tags for social sharing
  const ogTitle = document.querySelector('meta[property="og:title"]')
  if (ogTitle) {
    ogTitle.setAttribute('content', pageTitle)
  }
  
  const ogDescription = document.querySelector('meta[property="og:description"]')
  if (ogDescription) {
    ogDescription.setAttribute('content', pageDescription)
  }
  
  // Update Twitter tags
  const twitterTitle = document.querySelector('meta[name="twitter:title"]')
  if (twitterTitle) {
    twitterTitle.setAttribute('content', pageTitle)
  }
  
  const twitterDescription = document.querySelector('meta[name="twitter:description"]')
  if (twitterDescription) {
    twitterDescription.setAttribute('content', pageDescription)
  }
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
