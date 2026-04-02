<template>
  <div class="universes-page">
    <div class="container mx-auto px-4 py-12">
      <h1 class="text-4xl font-bold mb-2 text-gray-900 dark:text-white">Choose Your Universe</h1>
      <p class="text-lg text-gray-600 dark:text-gray-400 mb-12">
        Pick a universe to explore and start placing blocks
      </p>

      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-600 dark:text-gray-400">Loading universes...</p>
      </div>

      <div v-else-if="error" class="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 p-4 rounded">
        {{ error }}
      </div>

      <div v-else-if="universes.length === 0" class="text-center py-12">
        <p class="text-gray-600 dark:text-gray-400">No universes available</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="universe in universes"
          :key="universe.id"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200"
        >
          <div class="bg-gradient-to-r from-purple-500 to-blue-500 h-32 flex items-center justify-center">
            <span class="text-4xl">🌍</span>
          </div>
          <div class="p-6">
            <h2 class="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
              {{ universe.name }}
            </h2>
            <p class="text-gray-600 dark:text-gray-400 mb-4">
              {{ universe.block_count }} blocks available
            </p>
            <button
              @click="enterUniverse(universe.id)"
              :disabled="enteringUniverse === universe.id"
              class="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
            >
              {{ enteringUniverse === universe.id ? "Loading..." : "Enter" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from "@/stores/auth";
import api from "@/services/api";
import { useRouter } from "vue-router";

export default {
  name: "Universes",
  data() {
    return {
      universes: [],
      loading: true,
      error: null,
      enteringUniverse: null
    };
  },
  setup() {
    const authStore = useAuthStore();
    const router = useRouter();

    if (!authStore.isAuthenticated) {
      router.push("/login");
    }

    return {
      authStore,
      router
    };
  },
  mounted() {
    this.loadUniverses();
  },
  methods: {
    async loadUniverses() {
      try {
        this.loading = true;
        this.error = null;
        const response = await api.get("/universes/");
        this.universes = response.data.universes;
      } catch (error) {
        this.error = error.response?.data?.detail || error.message || "Failed to load universes";
      } finally {
        this.loading = false;
      }
    },
    async enterUniverse(universeId) {
      try {
        this.enteringUniverse = universeId;
        const response = await api.post(`/universes/${universeId}/enter/auth`);
        // Redirect to canvas with world_id
        this.router.push({
          path: "/canvas",
          query: { world_id: response.data.world_id }
        });
      } catch (error) {
        this.error = error.response?.data?.detail || error.message || "Failed to enter universe";
      } finally {
        this.enteringUniverse = null;
      }
    }
  }
};
</script>

<style scoped>
.universes-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>
