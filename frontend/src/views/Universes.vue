<template>
  <div class="universes-page">
    <div class="container">
      <h1>Choose Your Universe</h1>
      <p class="page-subtitle">Pick a universe to explore and start placing blocks</p>

      <div v-if="loading" class="loading">Loading universes...</div>

      <div v-else-if="error" class="error-message">{{ error }}</div>

      <div v-else-if="universes.length === 0" class="empty-state">
        No universes available
      </div>

      <div v-else class="universes-grid">
        <BaseCard
          v-for="universe in universes"
          :key="universe.id"
          class="universe-card"
          @click="enterUniverse(universe.id)"
          :style="{ 
            backgroundColor: universe.config?.backgroundColor || 'var(--surface)',
            color: universe.config?.textColor || 'var(--text-primary)'
          }"
        >
          <WorldPreview
            v-if="universe.world"
            :world="universe.world"
            :universe-config="universe.config"
            :canvas-width="240"
            :canvas-height="170"
            class="world-preview"
          />
          <div v-else class="world-preview-placeholder">
            <div class="placeholder-text">No world yet</div>
          </div>
          <h3>{{ universe.name }}</h3>
          <div class="universe-stats">
            <p>
              <img src="/icons/blocks.svg" alt="available blocks" class="stat-icon" />
              {{ universe.available_blocks }} available block{{ universe.available_blocks === 1 ? '' : 's' }}
            </p>
            <p>
              <img src="/icons/bricks.svg" alt="placed blocks" class="stat-icon" />
              {{ universe.placed_blocks }} blocks placed
            </p>
          </div>
          <BaseButton
            :disabled="enteringUniverse === universe.id"
            class="enter-button"
          >
            {{ enteringUniverse === universe.id ? 'Loading...' : 'Enter' }}
          </BaseButton>
        </BaseCard>

        <BaseCard
          class="universe-card more-card"
          @click="router.push('/universe-contribution')"
        >
          <img id="style-image" src="/images/styles.png">
          <h3>Want more universes?</h3>
          <p class="more-description">Contribute your own universe — your own theme, your own blocks.</p>
          <span class="more-link">Learn how →</span>
        </BaseCard>
      </div>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from "@/stores/auth";
import api from "@/services/api";
import { useRouter } from "vue-router";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import WorldPreview from '@/components/WorldPreview.vue'

export default {
  name: "Universes",
  components: {
    BaseCard,
    BaseButton,
    WorldPreview
  },
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
        const token = this.authStore.token;
        const response = await api.get("/universes/", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
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
  width: 100%;
  height: 100%;
  background-color: var(--background);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

h1 {
  margin-bottom: 0.5rem;
  letter-spacing: -1.5px;
}

.page-subtitle {
  color: var(--text-secondary);
  margin-bottom: 2rem;
  font-size: 1rem;
}

.universes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.universe-card {
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
}

.universe-card:hover {
  border-color: var(--text-primary);
  transform: translateY(-2px);
}

.world-preview {
  width: 100%;
  border-radius: 0;
}

.world-preview-placeholder {
  width: 100%;
  height: 170px;
  background-color: var(--background);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

#style-image {
  width: 100%;
  height: auto;
  object-fit: contain;
  border-radius: 10px;
  opacity: 0.4;
}

.universe-card h3 {
  margin: 0;
  font-size: 1.2rem;
  letter-spacing: -0.5px;
}

.universe-stats {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.universe-stats p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  object-fit: contain;
}

.enter-button {
  width: 100%;
}

.more-card {
  border-style: dashed;
  cursor: pointer;
}

.more-card:hover {
  border-color: var(--text-primary);
  border-style: solid;
  transform: translateY(-2px);
}

.more-description {
  flex: 1;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.more-link {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 600;
}

.loading,
.error-message,
.empty-state {
  text-align: center;
  padding: 3rem;
  border: 1px solid var(--border);
  background-color: var(--surface);
}

.error-message {
  color: var(--error);
  border-color: var(--error);
}

.empty-state {
  color: var(--text-secondary);
}
</style>
